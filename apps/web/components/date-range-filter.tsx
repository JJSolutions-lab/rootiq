"use client";
import { cn } from "@/lib/utils";
export type RangePreset =
  "today" | "yesterday" | "week" | "month" | "year" | "custom";
export function buildRangeQuery(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
) {
  const now = new Date();
  let from: Date | undefined;
  let to = new Date(now);
  const start = (d: Date) => {
    d.setHours(0, 0, 0, 0);
    return d;
  };
  if (preset === "today") from = start(new Date(now));
  if (preset === "yesterday") {
    from = start(new Date(now));
    from.setDate(from.getDate() - 1);
    to = new Date(from);
    to.setHours(23, 59, 59, 999);
  }
  if (preset === "week") {
    from = start(new Date(now));
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  }
  if (preset === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (preset === "year") from = new Date(now.getFullYear(), 0, 1);
  if (preset === "custom") {
    from = customFrom ? start(new Date(`${customFrom}T00:00:00`)) : undefined;
    to = customTo ? new Date(`${customTo}T23:59:59.999`) : new Date(now);
  }
  const q = new URLSearchParams();
  if (from) q.set("from", from.toISOString());
  if (to) q.set("to", to.toISOString());
  return q.toString();
}
export function DateRangeFilter({
  preset,
  setPreset,
  from,
  to,
  setFrom,
  setTo,
}: {
  preset: RangePreset;
  setPreset: (x: RangePreset) => void;
  from: string;
  to: string;
  setFrom: (x: string) => void;
  setTo: (x: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mr-2">
        <b className="block text-xs">Date range</b>
        <small className="text-[10px] text-slate-400">
          Applies to all data below
        </small>
      </div>
      {(["today", "yesterday", "week", "month", "year"] as RangePreset[]).map(
        (x) => (
          <button
            key={x}
            onClick={() => setPreset(x)}
            className={cn(
              "h-9 rounded-xl px-3 text-xs font-semibold capitalize",
              preset === x
                ? "bg-emerald-700 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {x === "week"
              ? "This week"
              : x === "month"
                ? "This month"
                : x === "year"
                  ? "This year"
                  : x}
          </button>
        ),
      )}
      <button
        onClick={() => setPreset("custom")}
        className={cn(
          "h-9 rounded-xl px-3 text-xs font-semibold",
          preset === "custom"
            ? "bg-emerald-700 text-white"
            : "bg-slate-100 text-slate-600",
        )}
      >
        Custom
      </button>
      {preset === "custom" && (
        <>
          <label className="text-[10px] font-semibold text-slate-500">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="ml-2 h-9 rounded-lg border border-slate-200 px-2 text-xs"
            />
          </label>
          <label className="text-[10px] font-semibold text-slate-500">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="ml-2 h-9 rounded-lg border border-slate-200 px-2 text-xs"
            />
          </label>
        </>
      )}
    </div>
  );
}
