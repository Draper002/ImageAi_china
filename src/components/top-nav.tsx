import Link from "next/link";
import { ImageIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import type { Locale } from "@/lib/presets";

type TopNavProps = {
  className?: string;
  locale?: Locale;
};

const copy = {
  zh: {
    examples: "案例赏析",
    feedback: "反馈有礼"
  },
  en: {
    examples: "Examples",
    feedback: "Rewards"
  }
} satisfies Record<Locale, Record<string, string>>;

function href(path: string, locale: Locale) {
  return locale === "en" ? `${path}?locale=en` : path;
}

export function TopNav({ className = "top-nav-links", locale = "zh" }: TopNavProps) {
  const t = copy[locale];

  return (
    <div className={className}>
      <Link className="top-nav-link" href={href("/examples", locale)}>
        <ImageIcon className="h-4 w-4" />
        {t.examples}
      </Link>
      <Link className="top-nav-link" href={href("/feedback", locale)}>
        <LightningBoltIcon className="h-4 w-4" />
        {t.feedback}
      </Link>
    </div>
  );
}
