"use client";
import React from "react";

interface MonthlyViewProps {
  selectedDate: Date;
  events: any[];
  onDayClick: (date: Date) => void;
}

const EVENT_COLORS_MONTHLY = [
  'rgba(59,130,246,0.7)',
  'rgba(168,85,247,0.7)',
  'rgba(236,72,153,0.7)',
  'rgba(34,197,94,0.7)',
  'rgba(245,158,11,0.7)',
  'rgba(14,165,233,0.7)',
];

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function hashColor(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
  return Math.abs(hash) % EVENT_COLORS_MONTHLY.length;
}

export function MonthlyView({ selectedDate, events, onDayClick }: MonthlyViewProps) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1);
  const startDay = new Date(firstDay);
  let dayOfWeek = firstDay.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;
  startDay.setDate(startDay.getDate() - (dayOfWeek - 1));

  const calendarDays: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    calendarDays.push(d);
  }

  const weeks = calendarDays[34].getMonth() !== month ? 5 : 6;
  const visibleDays = calendarDays.slice(0, weeks * 7);

  function getEventsForDay(date: Date) {
    return events.filter(ev => {
      if (!ev.start?.dateTime) return false;
      return isSameDay(new Date(ev.start.dateTime), date);
    });
  }

  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-black/10">
        {weekdays.map((wd, i) => (
          <div key={i} className={`text-center py-1.5 text-[11px] font-serif ${i === 5 ? "text-blue-400/60" : i === 6 ? "text-red-400/60" : "text-black/40"}`}>
            {wd}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {visibleDays.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month;
          const isT = isSameDay(day, today);
          const dayEvents = getEventsForDay(day);
          const colIndex = i % 7;

          return (
            <div key={i}
              className={`border-b border-r border-black/5 p-1 cursor-pointer hover:bg-black/[0.03] transition-colors relative overflow-hidden
                ${!isCurrentMonth ? "opacity-30" : ""}
                ${isT ? "bg-black/[0.04]" : ""}
              `}
              onClick={() => onDayClick(day)}>
              <div className={`text-xs font-medium mb-0.5 ${isT ? "bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center" : colIndex === 5 ? "text-blue-400/70" : colIndex === 6 ? "text-red-400/70" : "text-black/60"}`}>
                {day.getDate()}
              </div>

              {/* 予定名を表示（最大3件） */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => {
                  const color = EVENT_COLORS_MONTHLY[hashColor(ev.id || ev.summary || '')];
                  const startTime = new Date(ev.start.dateTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={ev.id} className="flex items-center gap-0.5 overflow-hidden">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[8px] leading-tight truncate" style={{ color }}>
                        {startTime} {ev.summary}
                      </span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[8px] text-black/30">+{dayEvents.length - 3}件</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
