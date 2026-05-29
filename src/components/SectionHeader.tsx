import Link from "next/link";

export default function SectionHeader({
  kicker,
  title,
  href,
  hrefLabel = "전체 보기",
}: {
  kicker: string;
  title: string;
  href?: string | null;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-bone/10 pb-4">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 className="headline mt-2 text-2xl sm:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="link-underline shrink-0 text-sm text-muted"
        >
          {hrefLabel} →
        </Link>
      )}
    </div>
  );
}
