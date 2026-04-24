"use client";
import React, { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { supabase } from "@/lib/supabase";
import { Task, TaskItem } from "./TaskItem";
import { ViewMode } from "./DateNavigation";
import { WeeklyView } from "./WeeklyView";
import { MonthlyView } from "./MonthlyView";

const SLOT_HEIGHT = 40;
const DEFAULT_START = 8;
const DEFAULT_END = 22;
const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];
const TIME_LABEL_WIDTH = 44;

// Google予定の薄い色分けパレット
const EVENT_COLORS = [
  { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.35)', text: 'rgba(59,130,246,0.7)' },   // blue
  { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.35)', text: 'rgba(168,85,247,0.7)' },   // purple
  { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.35)', text: 'rgba(236,72,153,0.7)' },   // pink
  { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.35)',  text: 'rgba(34,197,94,0.7)' },    // green
  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.35)', text: 'rgba(245,158,11,0.7)' },   // amber
  { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.35)', text: 'rgba(14,165,233,0.7)' },   // sky
];

function getEventColor(index: number) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

interface CalendarViewProps {
  tasks: Task[];
  viewMode: ViewMode;
  selectedDate: Date;
  startHour?: number;
  endHour?: number;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onCompleteTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onDayClick: (date: Date) => void;
}

function hourToY(hour: number, startHour: number): number {
  return (hour - startHour) * 2 * SLOT_HEIGHT;
}
function durationToHeight(durationHours: number): number {
  return Math.max(durationHours * 2 * SLOT_HEIGHT, SLOT_HEIGHT);
}

interface TimeBlock {
  id: string;
  type: "event" | "task";
  startHour: number;
  endHour: number;
  data: any;
  column: number;
}

function assignColumns(blocks: TimeBlock[]): { items: TimeBlock[]; maxCols: number } {
  const sorted = [...blocks].sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);
  const columns: { endHour: number }[] = [];
  for (const block of sorted) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].endHour <= block.startHour) {
        block.column = c;
        columns[c].endHour = block.endHour;
        placed = true;
        break;
      }
    }
    if (!placed) {
      block.column = columns.length;
      columns.push({ endHour: block.endHour });
    }
  }
  return { items: sorted, maxCols: Math.min(columns.length, 3) };
}

export function CalendarView({ tasks, viewMode, selectedDate, startHour: propStart, endHour: propEnd, onUpdateTask, onCompleteTask, onDeleteTask, onDayClick }: CalendarViewProps) {
  const START_HOUR = propStart ?? DEFAULT_START;
  const END_HOUR = propEnd ?? DEFAULT_END;
  const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;
  const HOURS_AND_HALFS = Array.from({ length: TOTAL_SLOTS }, (_, i) => START_HOUR + i * 0.5);

  const [events, setEvents] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<string>("Loading...");
  const [needsReLogin, setNeedsReLogin] = useState(false);

  useEffect(() => {
    fetchGoogleCalendar();
  }, [selectedDate, viewMode]);

  const fetchGoogleCalendar = async () => {
    let token = localStorage.getItem("provider_token");
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.provider_token || null;
    }
    if (!token) {
      setApiStatus("Error: Google認証トークンが見つかりません。再ログインが必要です。");
      return;
    }
    try {
      setApiStatus("Fetching...");
      let startOfRange: Date, endOfRange: Date;

      if (viewMode === "daily") {
        startOfRange = new Date(selectedDate);
        startOfRange.setHours(0, 0, 0, 0);
        endOfRange = new Date(selectedDate);
        endOfRange.setHours(23, 59, 59, 999);
      } else if (viewMode === "weekly") {
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startOfRange = new Date(d);
        startOfRange.setDate(d.getDate() + diff);
        startOfRange.setHours(0, 0, 0, 0);
        endOfRange = new Date(startOfRange);
        endOfRange.setDate(startOfRange.getDate() + 6);
        endOfRange.setHours(23, 59, 59, 999);
      } else {
        startOfRange = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endOfRange = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfRange.toISOString()}&timeMax=${endOfRange.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=250`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const json = await res.json();
        setEvents(json.items || []);
        setApiStatus(json.items?.length > 0 ? `${json.items.length}件の予定` : "予定なし");
        setNeedsReLogin(false);
      } else if (res.status === 401) {
        // トークン期限切れ → クリアして再ログインを促す
        localStorage.removeItem('provider_token');
        setApiStatus("トークン期限切れ: 再ログインしてください");
        setNeedsReLogin(true);
      } else {
        const errJson = await res.json();
        setApiStatus(`Error ${res.status}: ${errJson.error?.message || "取得失敗"}`);
      }
    } catch (e: any) {
      setApiStatus(`Error: ${e.message}`);
    }
  };

  const statusBar = (
    <div className="flex-none p-1.5 mb-2 text-[10px] text-black/40 bg-black/5 rounded-sm border border-black/10 font-mono flex items-center justify-between">
      <span>{apiStatus}</span>
      {needsReLogin && (
        <button
          onClick={async () => {
            localStorage.removeItem('provider_token');
            await supabase.auth.signOut();
          }}
          className="text-[10px] px-2 py-0.5 bg-black/10 hover:bg-black/20 rounded text-black/60 transition-colors ml-2"
        >
          再ログイン
        </button>
      )}
    </div>
  );
  // Weekly / Monthly ビュー
  if (viewMode === "weekly") {
    return (
      <div className="flex flex-col h-full">
        {statusBar}
        <WeeklyView selectedDate={selectedDate} events={events} onDayClick={onDayClick} />
      </div>
    );
  }

  if (viewMode === "monthly") {
    return (
      <div className="flex flex-col h-full">
        {statusBar}
        <MonthlyView selectedDate={selectedDate} events={events} onDayClick={onDayClick} />
      </div>
    );
  }

  // ── Daily View ──
  const allBlocks: TimeBlock[] = [];

  events
    .filter((ev) => ev.start?.dateTime && ev.end?.dateTime)
    .forEach((ev) => {
      const start = new Date(ev.start.dateTime);
      const end = new Date(ev.end.dateTime);
      allBlocks.push({
        id: ev.id,
        type: "event",
        startHour: start.getHours() + start.getMinutes() / 60,
        endHour: end.getHours() + end.getMinutes() / 60,
        data: ev,
        column: 0,
      });
    });

  tasks
    .filter((t) => t.scheduled_hour != null)
    .forEach((t) => {
      const dur = t.scheduled_duration || 0.5;
      allBlocks.push({
        id: t.id,
        type: "task",
        startHour: t.scheduled_hour!,
        endHour: t.scheduled_hour! + dur,
        data: t,
        column: 0,
      });
    });

  const { items: layoutItems, maxCols } = assignColumns(allBlocks);
  const effectiveCols = Math.max(maxCols, 1);
  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT;

  return (
    <div className="flex flex-col h-full relative">
      {statusBar}

      <div className="flex-1 overflow-y-auto z-10 relative pb-20">
        <div className="relative" style={{ height: totalHeight }}>
          {HOURS_AND_HALFS.map((hour, i) => {
            const isHalf = hour % 1 !== 0;
            return (
              <div
                key={`grid-${hour}`}
                className={`absolute left-0 right-0 border-b ${isHalf ? "border-black/5" : "border-black/10"}`}
                style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
              >
                {!isHalf && (
                  <span className="text-[10px] text-black/30 font-serif select-none absolute -top-2 left-0 bg-[#eef0ee] px-1 z-30 w-[44px] text-right pr-2">
                    {hour}:00
                  </span>
                )}
              </div>
            );
          })}

          {HOURS_AND_HALFS.map((hour, i) => (
            <DropSlot key={`drop-${hour}`} hour={hour} top={i * SLOT_HEIGHT} />
          ))}

          {layoutItems.map((block, blockIndex) => {
            const top = hourToY(block.startHour, START_HOUR);
            const height = durationToHeight(block.endHour - block.startHour);
            const colWidth = `calc((100% - ${TIME_LABEL_WIDTH}px) / ${effectiveCols})`;
            const colLeft = `calc(${TIME_LABEL_WIDTH}px + (100% - ${TIME_LABEL_WIDTH}px) * ${block.column} / ${effectiveCols})`;

            if (block.type === "event") {
              const ev = block.data;
              const color = getEventColor(blockIndex);
              return (
                <div
                  key={`ev-${block.id}`}
                  className="absolute rounded-sm pointer-events-none z-10 overflow-hidden"
                  style={{
                    top: top + 1, height: height - 2,
                    left: colLeft, width: colWidth,
                    background: color.bg,
                    borderLeft: `3px solid ${color.border}`,
                  }}
                >
                  <div className="p-1.5 h-full">
                    <span className="text-[11px] italic font-medium line-clamp-2 block" style={{ color: color.text }}>{ev.summary}</span>
                    <span className="text-[9px] text-black/30 block mt-0.5">
                      {new Date(ev.start.dateTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}–
                      {new Date(ev.end.dateTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            }

            const task = block.data as Task;
            return (
              <div
                key={`task-${block.id}`}
                className="absolute z-20 overflow-auto"
                style={{ top: top + 2, height: height - 4, left: colLeft, width: colWidth }}
              >
                <div className="h-full flex flex-col">
                  <TaskItem task={task} onUpdate={onUpdateTask} onComplete={onCompleteTask} onDelete={onDeleteTask} />
                  <div className="flex items-center gap-1 px-1 mt-auto">
                    <select
                      value={task.scheduled_duration || 0.5}
                      onChange={(e) => onUpdateTask(task.id, { scheduled_duration: parseFloat(e.target.value) })}
                      className="text-[10px] text-black/40 bg-transparent border border-black/10 rounded px-1 py-0.5 cursor-pointer hover:border-black/30 transition-colors"
                    >
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d * 60}分</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DropSlot({ hour, top }: { hour: number; top: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `timeslot-${hour}` });
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 transition-colors ${isOver ? "bg-black/10 z-5" : ""}`}
      style={{ top, height: SLOT_HEIGHT }}
    />
  );
}
