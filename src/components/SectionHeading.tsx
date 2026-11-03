import { pageGutterClass } from "@/components/navChrome";

type SectionHeadingProps = {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
};

export function SectionHeading({ title, subtitle, action }: SectionHeadingProps) {
  return (
    <div
      className={`sticky top-[calc(3.5rem+3px)] z-30 bg-[var(--surface)] sm:top-[calc(4rem+3px)] md:top-[calc(5rem+3px)] ${pageGutterClass}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sah1 pt-[calc(0.175*5rem)] text-[calc(0.65*5rem)] leading-none text-[var(--ink)] md:pt-[calc(0.175*6rem)] md:text-[calc(0.65*6rem)]">
            {title}
          </h1>
          <p className="font-offbit mt-5 pb-8 text-[15px] tracking-[0.04em] text-[var(--ink)] md:mt-6 md:pb-10 md:text-[17px]">
            {subtitle}
          </p>
        </div>
        {action ? <div className="pb-8 md:pb-10">{action}</div> : null}
      </div>
    </div>
  );
}
