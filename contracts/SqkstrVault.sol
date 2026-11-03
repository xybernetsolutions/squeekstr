// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
}

interface ISqueekNFT is IERC721 {
    function level(uint256 tokenId) external view returns (uint256);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface ISqueekStaking {
    function deposit(address token, uint256[] calldata tokenIds) external;
    function withdraw(address token, uint256[] calldata tokenIds) external;
    function claim(address account) external;
    /// @dev Both tips must already be deposited with depositor == this vault.
    function mergeDeposited(address collection, uint256 survivor, uint256 donor) external;
}

interface ISqkstrTracker {
    function ownerOf(uint256 tokenId) external view returns (address);
    function mint(address to, uint256 tokenId, uint256 tipNft, uint8 level, uint256 power_) external;
    function burn(uint256 tokenId) external;
    function syncState(uint256 tokenId, uint256 tipNft, uint8 level, uint256 power_) external;
}

contract SqkstrVault {
    uint256 public constant POWER_SCALE = 1e18;
    uint8 public constant MAX_LEVEL = 10;

    ISqueekNFT public constant squeek = ISqueekNFT(0xCB98349c134aB983dA5BfD80527dfe2552bDB70F);
    ISqueekStaking public constant squeekStaking =
        ISqueekStaking(0x4b67b739dFd832f4EAC67a7Aa3bc244fB74cea4F);
    ISqkstrTracker public constant trackerNft =
        ISqkstrTracker(0x8F4483e90ADE9B2b4950DFA841c877b5d3Bf969d);
    IERC20 public constant sqk = IERC20(0x5501E1Fa81Be1c3F49225fa7668DA0245d07Db60);
    address public constant protocolTreasury = 0xe435655299253312C1f51e4f1deA805ae8e11D98;
    address public owner;

    struct Tracker {
        address owner;
        uint256 power;
        uint256 rootTokenId;
        uint256 tipTokenId;
        uint8 rootLevel;
        bool active;
    }

    struct Tip {
        uint256 tokenId;
        uint8 level;
        uint256 protocolShare;
        uint256 communityPower;
        bool inVault;
        bool virginDeposit;
        address soleDepositor;
    }

    uint256 public nextTrackerId = 1;
    uint256 public protocolTrackerId;
    mapping(uint256 => Tracker) public trackers;
    mapping(uint256 => Tip) public tips;
    mapping(uint256 => uint256[]) private _tipTrackerIds;
    mapping(address => uint256[]) private _ownerTrackerIds;

    struct Epoch {
        uint256 reward;
        uint256 totalScore;
        uint256 startTime;
        uint256 endTime;
    }

    uint256 public totalPower;
    uint256 public currentEpoch;
    uint256 public epochStart;
    uint256 public totalEpochScore;
    uint256 public lastScoreUpdate;

    mapping(uint256 => Epoch) public epochs;
    mapping(uint256 => uint256) public userScore;
    mapping(uint256 => uint256) public userLastScoreUpdate;
    mapping(uint256 => uint256) public accountedPower;
    mapping(uint256 => mapping(uint256 => uint256)) public epochScore;
    mapping(uint256 => mapping(uint256 => bool)) public epochClaimed;
    mapping(uint256 => uint256) public claimed;

    uint256[] private _rewardIds;
    mapping(uint256 => uint256) private _rewardIndex;

    bool public protocolTrackerEarns = true;

    /// @dev Addresses allowed to finalize epochs via notify / claimStakingRewards (owner always can).
    mapping(address => bool) public rewardNotifiers;

    event Deposited(
        address indexed depositor,
        uint256 indexed tokenId,
        uint256 indexed trackerId,
        uint8 level,
        uint256 power
    );
    event Merged(
        uint256 indexed tipA,
        uint256 indexed tipB,
        uint256 indexed newTip,
        uint8 newLevel,
        uint256 protocolCut,
        uint256 communityBump
    );
    event TrackerTipUpdated(uint256 indexed trackerId, uint256 indexed newTip);
    event EmergencyWithdraw(
        address indexed to,
        uint256 indexed tipTokenId,
        uint256 trackersBurned,
        uint256 protocolShareForfeited
    );
    event TrackerBurned(uint256 indexed trackerId, uint256 indexed tipTokenId);
    event ProtocolTrackerCredited(uint256 indexed trackerId, uint256 amount, uint256 newPower);
    event ProtocolTrackerDebited(uint256 indexed trackerId, uint256 amount, uint256 newPower);
    event EpochFinalized(
        uint256 indexed epochId,
        uint256 reward,
        uint256 totalScore,
        uint256 startTime,
        uint256 endTime
    );
    event Claimed(address indexed user, uint256 indexed trackerId, uint256 indexed epochId, uint256 amount);
    event Staked(uint256 indexed tokenId);
    event Unstaked(uint256 indexed tokenId);
    event StakingRewardsClaimed(uint256 amount);
    /// @dev Open-epoch scores wiped; trackers keep power and resume accruing from `at`.
    event OpenEpochScoresReset(uint256 at, uint256 trackersReset);

    error NotOwner();
    error BadLevel();
    error TipMissing();
    error LevelMismatch();
    error SameDepositorVirginMerge();
    error SameTip();
    error ZeroAddress();
    error NotVaultHolding();
    error NotStaked();
    error ZeroAmount();
    error NoPower();
    error NotTrackerOwner();
    error InactiveTracker();
    error BadEpoch();
    error AlreadyClaimed();
    error NoScore();
    error NotRewardNotifier();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOwnerOrRewardNotifier() {
        if (msg.sender != owner && !rewardNotifiers[msg.sender]) revert NotRewardNotifier();
        _;
    }

    constructor() {
        owner = msg.sender;
        squeek.setApprovalForAll(address(squeekStaking), true);

        protocolTrackerId = nextTrackerId++;
        trackers[protocolTrackerId] = Tracker({
            owner: protocolTreasury,
            power: 0,
            rootTokenId: 0,
            tipTokenId: 0,
            rootLevel: 0,
            active: true
        });
        _ownerTrackerIds[protocolTreasury].push(protocolTrackerId);
        epochStart = block.timestamp;
        lastScoreUpdate = block.timestamp;
    }

    function setProtocolTrackerEarns(bool earns) external onlyOwner {
        protocolTrackerEarns = earns;
    }

    function setRewardNotifier(address account, bool allowed) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        rewardNotifiers[account] = allowed;
    }

    /// @notice Zero every active tracker’s open-epoch score so all share the same headstart.
    /// @dev Does **not** finalize or pay SQK. Power unchanged; `liveScore` restarts from 0 at `block.timestamp`.
    function resetOpenEpochScores() external onlyOwner {
        uint256 n = _rewardIds.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 id = _rewardIds[i];
            userScore[id] = 0;
            userLastScoreUpdate[id] = block.timestamp;
        }
        totalEpochScore = 0;
        epochStart = block.timestamp;
        lastScoreUpdate = block.timestamp;
        emit OpenEpochScoresReset(block.timestamp, n);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }

    function basePower(uint8 level) public pure returns (uint256) {
        if (level == 0 || level > MAX_LEVEL) revert BadLevel();
        uint256 p = 1000 * POWER_SCALE;
        for (uint8 i = 1; i < level; i++) {
            p = (p * 22) / 10;
        }
        return p;
    }

    function basePowerRaw(uint8 level) public pure returns (uint256) {
        return basePower(level) / POWER_SCALE;
    }

    function deposit(uint256 tokenId) external returns (uint256 trackerId) {
        uint256 lvl = squeek.level(tokenId);
        if (lvl == 0 || lvl > MAX_LEVEL) revert BadLevel();
        uint8 level = uint8(lvl);

        squeek.transferFrom(msg.sender, address(this), tokenId);
        _stake(tokenId);

        uint256 power = basePower(level);
        trackerId = nextTrackerId++;
        trackers[trackerId] = Tracker({
            owner: msg.sender,
            power: power,
            rootTokenId: tokenId,
            tipTokenId: tokenId,
            rootLevel: level,
            active: true
        });
        _ownerTrackerIds[msg.sender].push(trackerId);

        tips[tokenId] = Tip({
            tokenId: tokenId,
            level: level,
            protocolShare: 0,
            communityPower: power,
            inVault: true,
            virginDeposit: true,
            soleDepositor: msg.sender
        });
        _tipTrackerIds[tokenId].push(trackerId);

        _registerRewardPower(trackerId, power);
        trackerNft.mint(msg.sender, trackerId, tokenId, level, power);

        emit Deposited(msg.sender, tokenId, trackerId, level, power);
    }

    struct MergeCalc {
        uint256 cSum;
        uint256 newCommunity;
        uint256 newProtocol;
        uint256 protocolCut;
        uint256 communityBump;
        uint8 newLevel;
    }

    function merge(uint256 myTip, uint256 otherTip) external returns (uint256) {
        _requireMergeable(myTip, otherTip);

        MergeCalc memory m = _mergeCalc(myTip, otherTip);

        // Keep custody in staking. Vault is the common depositor, so mergeDeposited
        // is authorized; collection.merge runs as staking (NFT owner). Avoids the
        // broken unstake → squeekMerge (OnlyKeeper) → restake path.
        squeekStaking.mergeDeposited(address(squeek), myTip, otherTip);
        if (squeek.ownerOf(myTip) != address(squeekStaking)) revert NotStaked();

        _applyMergeState(myTip, otherTip, m);
        _syncMergedTrackers(myTip, otherTip, m.newLevel);
        _creditProtocol(m.protocolCut);

        emit Merged(otherTip, myTip, myTip, m.newLevel, m.protocolCut, m.communityBump);
        return myTip;
    }

    function _requireMergeable(uint256 myTip, uint256 otherTip) internal view {
        if (myTip == otherTip) revert SameTip();
        Tip storage keep = tips[myTip];
        Tip storage burn = tips[otherTip];
        if (!keep.inVault || !burn.inVault) revert TipMissing();
        if (keep.level != burn.level) revert LevelMismatch();
        if (keep.level >= MAX_LEVEL) revert BadLevel();
        if (!_hasActiveTracker(msg.sender, myTip)) revert NotOwner();
        if (
            keep.virginDeposit && burn.virginDeposit && keep.soleDepositor != address(0)
                && keep.soleDepositor == burn.soleDepositor
        ) {
            revert SameDepositorVirginMerge();
        }
    }

    function _mergeCalc(uint256 myTip, uint256 otherTip) internal view returns (MergeCalc memory m) {
        Tip storage keep = tips[myTip];
        Tip storage burn = tips[otherTip];
        uint256 sum = keep.communityPower + keep.protocolShare + burn.communityPower + burn.protocolShare;
        uint256 bump = sum / 10;
        m.communityBump = (bump * 75) / 100;
        m.protocolCut = bump - m.communityBump;
        m.cSum = keep.communityPower + burn.communityPower;
        m.newCommunity = m.cSum + m.communityBump;
        m.newProtocol = keep.protocolShare + burn.protocolShare + m.protocolCut;
        m.newLevel = keep.level + 1;
    }

    function _assertVaultHolds(uint256 tokenId) internal view {
        if (squeek.ownerOf(tokenId) != address(this)) revert NotVaultHolding();
    }

    function _applyMergeState(uint256 myTip, uint256 otherTip, MergeCalc memory m) internal {
        _scaleTrackersOnTip(myTip, m.cSum, m.newCommunity);
        _migrateTrackers(otherTip, myTip, m.cSum, m.newCommunity);

        Tip storage burn = tips[otherTip];
        burn.inVault = false;
        burn.communityPower = 0;
        burn.protocolShare = 0;

        Tip storage keep = tips[myTip];
        keep.level = m.newLevel;
        keep.communityPower = m.newCommunity;
        keep.protocolShare = m.newProtocol;
        keep.virginDeposit = false;
        keep.soleDepositor = address(0);
        keep.inVault = true;
    }

    function _syncMergedTrackers(uint256 myTip, uint256 otherTip, uint8 newLevel) internal {
        _syncTipTrackers(myTip, myTip, newLevel);
        _syncTipTrackers(otherTip, myTip, newLevel);
    }

    function _syncTipTrackers(uint256 tipId, uint256 survivingTip, uint8 newLevel) internal {
        uint256[] storage ids = _tipTrackerIds[tipId];
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 tid = ids[i];
            Tracker storage t = trackers[tid];
            if (!t.active) continue;
            _updateRewardPower(tid, t.power);
            trackerNft.syncState(tid, survivingTip, newLevel, t.power);
        }
    }

    function _creditProtocol(uint256 protocolCut) internal {
        if (protocolCut == 0) return;
        Tracker storage pt = trackers[protocolTrackerId];
        uint256 oldP = pt.power;
        pt.power += protocolCut;
        if (protocolTrackerEarns) {
            if (oldP == 0) _registerRewardPower(protocolTrackerId, pt.power);
            else _updateRewardPower(protocolTrackerId, pt.power);
        }
        emit ProtocolTrackerCredited(protocolTrackerId, protocolCut, pt.power);
    }

    /// @dev Claim / merge rights follow the tracker ERC-721 owner (tradable receipts).
    ///      Protocol tracker #1 is vault-internal only (never minted).
    function _trackerOwner(uint256 trackerId) internal view returns (address) {
        if (trackerId == protocolTrackerId) return trackers[trackerId].owner;
        return trackerNft.ownerOf(trackerId);
    }

    function _hasActiveTracker(address user, uint256 tipTokenId) internal view returns (bool) {
        uint256[] storage ids = _tipTrackerIds[tipTokenId];
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 tid = ids[i];
            Tracker storage t = trackers[tid];
            if (t.active && _trackerOwner(tid) == user) return true;
        }
        return false;
    }

    function emergencyWithdraw(uint256 tipTokenId) external onlyOwner {
        Tip storage tip = tips[tipTokenId];
        if (!tip.inVault) revert TipMissing();

        if (squeek.ownerOf(tipTokenId) == address(squeekStaking)) {
            _unstake(tipTokenId);
        }
        if (squeek.ownerOf(tipTokenId) != address(this)) revert NotVaultHolding();

        uint256[] storage ids = _tipTrackerIds[tipTokenId];
        uint256 burned;
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 tid = ids[i];
            Tracker storage t = trackers[tid];
            if (!t.active) continue;
            _unregisterRewardPower(tid);
            t.active = false;
            t.power = 0;
            t.tipTokenId = 0;
            trackerNft.burn(tid);
            burned++;
            emit TrackerBurned(tid, tipTokenId);
        }

        uint256 forfeited = tip.protocolShare;
        tip.inVault = false;
        tip.communityPower = 0;
        tip.protocolShare = 0;
        tip.virginDeposit = false;
        tip.soleDepositor = address(0);
        delete _tipTrackerIds[tipTokenId];

        if (forfeited > 0) {
            Tracker storage pt = trackers[protocolTrackerId];
            uint256 oldP = pt.power;
            if (pt.power >= forfeited) pt.power -= forfeited;
            else pt.power = 0;

            if (protocolTrackerEarns) {
                if (pt.power == 0) _unregisterRewardPower(protocolTrackerId);
                else if (oldP > 0) _updateRewardPower(protocolTrackerId, pt.power);
            }
            emit ProtocolTrackerDebited(protocolTrackerId, forfeited, pt.power);
        }

        squeek.safeTransferFrom(address(this), owner, tipTokenId);
        emit EmergencyWithdraw(owner, tipTokenId, burned, forfeited);
    }

    /// @notice Pull SQK mining rewards from staking into the vault, then finalize
    ///         the current epoch with that amount in the same transaction.
    /// @dev Owner or whitelisted notifier only. `squeekStaking.claim` pays the vault.
    ///      If nothing was claimed, skips finalize. Reverts if there is no epoch score yet.
    function claimStakingRewards() external onlyOwnerOrRewardNotifier returns (uint256 amount) {
        uint256 beforeBal = sqk.balanceOf(address(this));
        squeekStaking.claim(address(this));
        amount = sqk.balanceOf(address(this)) - beforeBal;
        emit StakingRewardsClaimed(amount);

        if (amount > 0) {
            _finalizeEpoch(amount);
        }
    }

    function _stake(uint256 tokenId) internal {
        if (squeek.ownerOf(tokenId) != address(this)) revert NotVaultHolding();
        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        squeekStaking.deposit(address(squeek), ids);
        if (squeek.ownerOf(tokenId) != address(squeekStaking)) revert NotStaked();
        emit Staked(tokenId);
    }

    function _unstake(uint256 tokenId) internal {
        if (squeek.ownerOf(tokenId) != address(squeekStaking)) revert NotStaked();
        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        squeekStaking.withdraw(address(squeek), ids);
        if (squeek.ownerOf(tokenId) != address(this)) revert NotVaultHolding();
        emit Unstaked(tokenId);
    }

    function _migrateTrackers(uint256 fromTip, uint256 toTip, uint256 cSum, uint256 newCommunity)
        internal
    {
        uint256[] storage ids = _tipTrackerIds[fromTip];
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 tid = ids[i];
            Tracker storage t = trackers[tid];
            if (!t.active) continue;
            if (cSum > 0) t.power = (t.power * newCommunity) / cSum;
            t.tipTokenId = toTip;
            _tipTrackerIds[toTip].push(tid);
            emit TrackerTipUpdated(tid, toTip);
        }
        delete _tipTrackerIds[fromTip];
    }

    function _scaleTrackersOnTip(uint256 tipId, uint256 cSum, uint256 newCommunity) internal {
        uint256[] storage ids = _tipTrackerIds[tipId];
        for (uint256 i = 0; i < ids.length; i++) {
            Tracker storage t = trackers[ids[i]];
            if (!t.active) continue;
            if (cSum > 0) t.power = (t.power * newCommunity) / cSum;
            emit TrackerTipUpdated(ids[i], tipId);
        }
    }

    function _syncGlobalScore() internal {
        if (block.timestamp <= lastScoreUpdate) return;
        totalEpochScore += totalPower * (block.timestamp - lastScoreUpdate);
        lastScoreUpdate = block.timestamp;
    }

    function _syncUserScore(uint256 trackerId) internal {
        _syncGlobalScore();
        uint256 last = userLastScoreUpdate[trackerId];
        if (last == 0) {
            userLastScoreUpdate[trackerId] = block.timestamp;
            return;
        }
        if (block.timestamp <= last) return;
        uint256 p = accountedPower[trackerId];
        if (p > 0) userScore[trackerId] += p * (block.timestamp - last);
        userLastScoreUpdate[trackerId] = block.timestamp;
    }

    function _addRewardId(uint256 trackerId) internal {
        if (_rewardIndex[trackerId] != 0) return;
        _rewardIds.push(trackerId);
        _rewardIndex[trackerId] = _rewardIds.length;
    }

    function _removeRewardId(uint256 trackerId) internal {
        uint256 idx = _rewardIndex[trackerId];
        if (idx == 0) return;
        uint256 lastIdx = _rewardIds.length;
        uint256 lastId = _rewardIds[lastIdx - 1];
        if (idx != lastIdx) {
            _rewardIds[idx - 1] = lastId;
            _rewardIndex[lastId] = idx;
        }
        _rewardIds.pop();
        delete _rewardIndex[trackerId];
    }

    /// @notice Finalize the open epoch with `amount` SQK. Owner or whitelisted notifier only.
    function notifyRewardAmount(uint256 amount) external onlyOwnerOrRewardNotifier {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = sqk.balanceOf(address(this));
        if (bal < amount) {
            bool ok = sqk.transferFrom(msg.sender, address(this), amount - bal);
            require(ok, "SQK transferFrom");
        }
        _finalizeEpoch(amount);
    }

    function _finalizeEpoch(uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();

        uint256 n = _rewardIds.length;
        for (uint256 i = 0; i < n; i++) {
            _syncUserScore(_rewardIds[i]);
        }
        _syncGlobalScore();

        if (totalEpochScore == 0) revert NoScore();

        uint256 epochId = currentEpoch;
        epochs[epochId] = Epoch({
            reward: amount,
            totalScore: totalEpochScore,
            startTime: epochStart,
            endTime: block.timestamp
        });

        for (uint256 i = 0; i < n; i++) {
            uint256 id = _rewardIds[i];
            epochScore[id][epochId] = userScore[id];
            userScore[id] = 0;
            userLastScoreUpdate[id] = block.timestamp;
        }

        emit EpochFinalized(epochId, amount, totalEpochScore, epochStart, block.timestamp);

        currentEpoch = epochId + 1;
        totalEpochScore = 0;
        epochStart = block.timestamp;
        lastScoreUpdate = block.timestamp;
    }

    function pending(uint256 trackerId, uint256 epochId) public view returns (uint256) {
        Epoch storage e = epochs[epochId];
        if (e.totalScore == 0 || e.reward == 0) return 0;
        if (epochClaimed[trackerId][epochId]) return 0;
        uint256 score = epochScore[trackerId][epochId];
        return (score * e.reward) / e.totalScore;
    }

    function liveScore(uint256 trackerId) public view returns (uint256) {
        uint256 score = userScore[trackerId];
        uint256 last = userLastScoreUpdate[trackerId];
        if (last == 0 || block.timestamp <= last) return score;
        return score + accountedPower[trackerId] * (block.timestamp - last);
    }

    function claim(uint256 trackerId, uint256 epochId) public {
        Tracker storage t = trackers[trackerId];
        if (!t.active) revert NotTrackerOwner();
        // Rights follow the receipt NFT — buyers can claim after transfer/sale.
        if (_trackerOwner(trackerId) != msg.sender) revert NotTrackerOwner();
        if (epochId >= currentEpoch) revert BadEpoch();
        if (epochClaimed[trackerId][epochId]) revert AlreadyClaimed();

        Epoch storage e = epochs[epochId];
        uint256 score = epochScore[trackerId][epochId];
        if (e.totalScore == 0 || score == 0) revert ZeroAmount();
        uint256 amount = (score * e.reward) / e.totalScore;
        if (amount == 0) revert ZeroAmount();

        epochClaimed[trackerId][epochId] = true;
        claimed[trackerId] += amount;
        // Keep storage owner in sync for indexers / getTracker readers.
        t.owner = msg.sender;

        bool ok = sqk.transfer(msg.sender, amount);
        require(ok, "SQK transfer");
        emit Claimed(msg.sender, trackerId, epochId, amount);
    }

    function claimEpochs(uint256 trackerId, uint256[] calldata epochIds) external {
        for (uint256 i = 0; i < epochIds.length; i++) {
            claim(trackerId, epochIds[i]);
        }
    }

    function _registerRewardPower(uint256 trackerId, uint256 power_) internal {
        if (trackerId == protocolTrackerId && !protocolTrackerEarns) {
            accountedPower[trackerId] = 0;
            return;
        }
        _syncGlobalScore();
        totalPower += power_;
        accountedPower[trackerId] = power_;
        userScore[trackerId] = 0;
        userLastScoreUpdate[trackerId] = block.timestamp;
        _addRewardId(trackerId);
    }

    function _updateRewardPower(uint256 trackerId, uint256 newPower) internal {
        if (trackerId == protocolTrackerId && !protocolTrackerEarns) {
            accountedPower[trackerId] = 0;
            return;
        }
        _syncUserScore(trackerId);
        uint256 oldP = accountedPower[trackerId];
        if (oldP > totalPower) oldP = totalPower;
        totalPower = totalPower - oldP + newPower;
        accountedPower[trackerId] = newPower;
    }

    function _unregisterRewardPower(uint256 trackerId) internal {
        _syncUserScore(trackerId);
        uint256 oldP = accountedPower[trackerId];
        if (oldP > 0 && oldP <= totalPower) totalPower -= oldP;
        accountedPower[trackerId] = 0;
        userScore[trackerId] = 0;
        delete userLastScoreUpdate[trackerId];
        _removeRewardId(trackerId);
    }

    function trackerCount(address owner_) external view returns (uint256) {
        return _ownerTrackerIds[owner_].length;
    }

    function trackerIdOfOwner(address owner_, uint256 index) external view returns (uint256) {
        return _ownerTrackerIds[owner_][index];
    }

    function tipTrackerIds(uint256 tipTokenId) external view returns (uint256[] memory) {
        return _tipTrackerIds[tipTokenId];
    }

    function getTracker(uint256 trackerId)
        external
        view
        returns (
            address owner_,
            uint256 power,
            uint256 rootTokenId,
            uint256 tipTokenId,
            uint8 rootLevel,
            uint8 tipLevel,
            bool active
        )
    {
        Tracker storage t = trackers[trackerId];
        Tip storage tip = tips[t.tipTokenId];
        owner_ = t.active ? _trackerOwner(trackerId) : t.owner;
        return (
            owner_,
            t.power,
            t.rootTokenId,
            t.tipTokenId,
            t.rootLevel,
            tip.inVault ? tip.level : t.rootLevel,
            t.active
        );
    }

    function canMergeTips(uint256 myTip, uint256 otherTip) external view returns (bool) {
        Tip storage keep = tips[myTip];
        Tip storage burn_ = tips[otherTip];
        if (!keep.inVault || !burn_.inVault || keep.level != burn_.level || myTip == otherTip) {
            return false;
        }
        if (keep.level >= MAX_LEVEL) return false;
        if (keep.virginDeposit && burn_.virginDeposit && keep.soleDepositor == burn_.soleDepositor) {
            return false;
        }
        return true;
    }
}
