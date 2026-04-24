"use client";
import React from "react";
import { getWeekStart } from "./DateNavigation";

interface WeeklyViewProps {
  selectedDate: Date;
  events: any[];
  onDayClick: (date: Date) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

const EVENT_COLORS = [
  { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.4)', text: 'rgba(59,130,246,0.8)' },
  { bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.4)', text: 'rgba(168,85,247,0.8)' },
  { bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.4)', text: 'rgba(236,72,153,0.8)' },
  { bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.4)',  text: 'rgba(34,197,94,0.8)' },
  { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.4)', text: 'rgba(245,158,11,0.8)' },
  { bg: 'rgba(14,165,233,0.10)', border: 'rgba(14,165,233,0.4)', text: 'rgba(14,165,233,0.8)' },
];

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// イベントIDからハッシュ的に色インデックスを決定
function hashColor(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
  return Math.abs(hash) % EVENT_COLORS.length;
}

export function WeeklyView({ selectedDate, events, onDayClick }: WeeklyViewProps) {
  const weekStart = getWeekStart(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();

  function getEventsForDay(date: Date) {
    return events.filter(ev => {
      if (!ev.start?.dateTime) return false;
      return isSameDay(new Date(ev.start.dateTime), date);
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* 曜日ヘッダー */}
      <div className="flex border-b border-black/10">
        <div className="w-10 flex-shrink-0" />
        {days.map((day, i) => {
          const isT = isSameDay(day, today);
          const weekday = day.toLocaleDateString("ja-JP", { weekday: "short" });
          return (
            <div key={i}
              className={`flex-1 text-center py-2 cursor-pointer hover:bg-black/5 transition-colors border-l border-black/5 ${isT ? "bg-black/[0.03]" : ""}`}
              onClick={() => onDayClick(day)}>
              <div className="text-[10px] text-black/40 font-serif">{weekday}</div>
              <div className={`text-sm font-medium ${isT ? "text-black/80 bg-black/10 rounded-full w-7 h-7 flex items-center justify-center mx-auto" : "text-black/60"}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* タイムグリッド */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {HOURS.map(hour => (
            <div key={hour} className="flex border-b border-black/5" style={{ minHeight: 48 }}>
              <div className="w-10 flex-shrink-0 text-[10px] text-black/30 font-serif text-right pr-1 pt-0.5">
                {hour}:00
              </div>
              {days.map((day, di) => {
                const dayEvents = getEventsForDay(day).filter(ev => {
                  const evDate = new Date(ev.start.dateTime);
                  return evDate.getHours() === hour;
                });

                return (
                  <div key={di}
                    className="flex-1 border-l border-black/5 relative cursor-pointer hover:bg-black/[0.02] transition-colors"
                    onClick={() => onDayClick(day)}>
                    {dayEvents.map(ev => {
                      const color = EVENT_COLORS[hashColor(ev.id || ev.summary || '')];
                      const start = new Date(ev.start.dateTime);
                      const end = new Date(ev.end.dateTime);
                      const dur = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      return (
                        <div key={ev.id}
                          className="absolute inset-x-0.5 top-0.5 rounded-sm p-0.5 overflow-hidden"
                          style={{
                            height: Math.max(dur * 48, 20),
                            background: color.bg,
                            borderLeft: `2px solid ${color.border}`,
                          }}>
                          <span className="text-[9px] italic line-clamp-2 block leading-tight font-medium" style={{ color: color.text }}>
                            {ev.summary}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
