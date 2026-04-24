"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "daily" | "weekly" | "monthly";

interface DateNavigationProps {
  selectedDate: Date;
  viewMode: ViewMode;
  onDateChange: (date: Date) => void;
}

function formatHeader(date: Date, viewMode: ViewMode): string {
  if (viewMode === "daily") {
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  }
  if (viewMode === "weekly") {
    const start = getWeekStart(date);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    const s = start.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    const e = end.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
    return `${s} 〜 ${e}`;
  }
  return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 月曜始まり
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function navigate(date: Date, viewMode: ViewMode, direction: number): Date {
  const d = new Date(date);
  if (viewMode === "daily") d.setDate(d.getDate() + direction);
  else if (viewMode === "weekly") d.setDate(d.getDate() + direction * 7);
  else d.setMonth(d.getMonth() + direction);
  return d;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export function DateNavigation({ selectedDate, viewMode, onDateChange }: DateNavigationProps) {
  const today = isToday(selectedDate);

  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <button
        onClick={() => onDateChange(navigate(selectedDate, viewMode, -1))}
        className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-black/50 hover:text-black/70"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center gap-3">
        <span className="text-sm font-serif text-black/70 tracking-wide">
          {formatHeader(selectedDate, viewMode)}
        </span>
        {!today && (
          <button
            onClick={() => onDateChange(new Date())}
            className="text-[10px] px-2 py-0.5 bg-black/5 hover:bg-black/10 rounded-full text-black/50 hover:text-black/70 transition-colors"
          >
            今日
          </button>
        )}
      </div>

      <button
        onClick={() => onDateChange(navigate(selectedDate, viewMode, 1))}
        className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-black/50 hover:text-black/70"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export { getWeekStart };
export type { ViewMode };
