import { Code2 } from "lucide-react";

export default function Footer({ variant = "light" }) {
  const isDark = variant === "dark";
  return (
    <div
      data-testid="app-footer"
      className={`w-full flex items-center justify-center py-4 text-[11px] tracking-wide select-none ${
        isDark ? "text-white/50" : "text-[#8E8E93]"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Code2 className="h-3 w-3" strokeWidth={2} />
        by <span className="font-semibold text-[#007AFF]">Aidan Suhendy</span>
        <span className="opacity-70">(Developer)</span>
      </span>
    </div>
  );
}
