import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Level } from "@/lib/scoring";

const dot: Record<Level, string> = {
  1: "bg-level-1",
  2: "bg-level-2",
  3: "bg-level-3",
  4: "bg-level-4",
};
const bar: Record<Level, string> = {
  1: "border-level-1",
  2: "border-level-2",
  3: "border-level-3",
  4: "border-level-4",
};

/** Color is never the only signal: the badge always shows "L<n>" and the level name. */
export function LevelBadge({ level, size = "md" }: { level: Level; size?: "md" | "lg" }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 bg-background font-medium",
        bar[level],
        size === "lg" ? "px-4 py-1.5 text-lg" : "px-3 py-0.5 text-sm",
      )}
    >
      <span className={cn("size-2.5 rounded-full", dot[level])} aria-hidden />
      <span className="font-mono">{t("levels.badge", { n: level })}</span>
      <span>{t(`levels.${level}`)}</span>
    </span>
  );
}
