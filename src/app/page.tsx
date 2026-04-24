"use client";
import React, { useState, useEffect } from "react";
import { Search, Settings, Calendar as CalendarIcon, LogOut } from "lucide-react";
import { TaskList } from "@/components/TaskList";
import { CalendarView } from "@/components/CalendarView";
import { DateNavigation, ViewMode } from "@/components/DateNavigation";
import { SearchPanel } from "@/components/SearchPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, defaultDropAnimationSideEffects } from "@dnd-kit/core";
import { supabase } from "@/lib/supabase";
import { Task } from "@/components/TaskItem";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [calStartHour, setCalStartHour] = useState(() => {
    if (typeof window !== 'undefined') return parseInt(localStorage.getItem('cal_start_hour') || '8');
    return 8;
  });
  const [calEndHour, setCalEndHour] = useState(() => {
    if (typeof window !== 'undefined') return parseInt(localStorage.getItem('cal_end_hour') || '22');
    return 22;
  });

  const handleChangeHours = (start: number, end: number) => {
    if (start >= end) return;
    setCalStartHour(start);
    setCalEndHour(end);
    localStorage.setItem('cal_start_hour', String(start));
    localStorage.setItem('cal_end_hour', String(end));
  };

  const cycleViewMode = () => {
    setViewMode(prev => prev === "daily" ? "weekly" : prev === "weekly" ? "monthly" : "daily");
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode("daily");
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const migratedTasks = [];
      const currentTasks = [];

      for (const t of data) {
        const targetDate = t.target_date || today; // target_dateが無い古いデータへのフォールバック
        
        // マイグレーション判定：過去の日付の未完了タスク
        if (targetDate < today && !t.completed) {
          t.target_date = today;
          t.scheduled_hour = null; // カレンダーに入れていたものも左のリストに戻る
          migratedTasks.push({ id: t.id, target_date: today, scheduled_hour: null });
          currentTasks.push(t);
        } else if (targetDate === today) {
          // 今日のタスク
          currentTasks.push(t);
        }
        // 過去の完了済みタスクは画面には表示しない（履歴として維持）
      }

      // DBへマイグレーション内容を一括保存（ここでは個別発行）
      for (const m of migratedTasks) {
        await supabase.from("tasks").update({ target_date: m.target_date, scheduled_hour: null }).eq("id", m.id);
      }

      currentTasks.sort((a,b) => (a.position_index || 0) - (b.position_index || 0));
      setTasks(currentTasks);
    }
    setLoading(false);
  };

  const handleAddTask = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const newTaskData = {
      user_id: userData.user.id,
      text: "",
      completed: false,
      position_index: tasks.length
    };

    const { data, error } = await supabase.from("tasks").insert(newTaskData).select().single();
    if (!error && data) setTasks([...tasks, data]);
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
    await supabase.from("tasks").update(updates).eq("id", id);
  };

  const handleCompleteTask = async (id: string, isCompleted: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: isCompleted } : t));
    await supabase.from("tasks").update({ completed: isCompleted }).eq("id", id);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const addToGoogleCalendar = async (taskId: string, taskText: string, hour: number, duration?: number): Promise<string | null> => {
    if (!taskText) return null;
    
    let token = localStorage.getItem('provider_token');
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.provider_token || null;
    }
    if (!token) return null;

    const now = new Date();
    const hourInt = Math.floor(hour);
    const minutes = (hour % 1 !== 0) ? 30 : 0;
    
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hourInt, minutes, 0);
    const durationMs = (duration || 0.5) * 60 * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);

    try {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: taskText,
          start: { dateTime: start.toISOString(), timeZone: "Asia/Tokyo" },
          end: { dateTime: end.toISOString(), timeZone: "Asia/Tokyo" }
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json.id || null;
      }
    } catch (e) {
      console.error('Google Calendar create error:', e);
    }
    return null;
  };

  const deleteFromGoogleCalendar = async (eventId: string) => {
    let token = localStorage.getItem('provider_token');
    if (!token) {
      const { data } = await supabase.auth.getSession();
      token = data.session?.provider_token || null;
    }
    if (!token || !eventId) return;

    try {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.error('Google Calendar delete error:', e);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskObj = tasks.find(t => t.id === active.id.toString());
    if (taskObj) setActiveTask(taskObj);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (over && over.id.toString().startsWith("timeslot-")) {
      const targetHourStr = over.id.toString().split("-")[1];
      const targetHour = parseFloat(targetHourStr); // parseFloatで30分枠(8.5)に対応
      const taskId = active.id.toString();
      
      const taskObj = tasks.find(t => t.id === taskId);
      
      handleUpdateTask(taskId, { scheduled_hour: targetHour, scheduled_duration: 0.5 });

      if (taskObj) {
        const eventId = await addToGoogleCalendar(taskId, taskObj.text, targetHour, 0.5);
        if (eventId) {
          handleUpdateTask(taskId, { scheduled_hour: targetHour, scheduled_duration: 0.5, google_event_id: eventId });
        }
      }
    } else if (over && over.id === "unassigned-tasks") {
      const taskId = active.id.toString();
      const taskObj = tasks.find(t => t.id === taskId);

      // Googleカレンダーの予定を削除
      if (taskObj?.google_event_id) {
        await deleteFromGoogleCalendar(taskObj.google_event_id);
      }

      handleUpdateTask(taskId, { scheduled_hour: null, scheduled_duration: null, google_event_id: null });
    }
  };

  // 左側に表示する未割当のタスク
  const unassignedTasks = tasks.filter(t => t.scheduled_hour == null);

  const dropAnimationConfig = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } })
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex w-full h-full">
      {/* センターの折り目 */}
      <div className="absolute left-1/2 top-0 bottom-0 w-8 -ml-4 bg-gradient-to-r from-transparent via-black/10 to-transparent pointer-events-none z-10 shadow-[inset_2px_0_10px_rgba(0,0,0,0.05),inset_-2px_0_10px_rgba(0,0,0,0.05)]" />

      {/* 左ページ: タスクリスト */}
      <div className="flex-1 border-r border-[#e0d9c8] p-8 md:p-12 notebook-lines overflow-y-auto relative">
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-black/10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-serif tracking-tight text-black/80">Daily Tasks</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl font-serif text-black/60">
              {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
            <button 
              onClick={async () => {
                localStorage.removeItem('provider_token');
                await supabase.auth.signOut();
              }}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/40 hover:text-black/60"
              title="ログアウト"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="space-y-0 h-full mt-4 pb-20">
          <TaskList 
            tasks={unassignedTasks} 
            loading={loading}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </div>

      {/* 右ページ: カレンダー / フリースペース */}
      <div className="flex-1 p-8 md:p-12 notebook-grid overflow-y-auto relative bg-white/30 backdrop-blur-[2px]">
        <header className="flex justify-between items-center mb-4 pb-4 border-b border-black/10">
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif text-black/60 italic">Schedule</span>
            <span className="text-[10px] px-2 py-0.5 bg-black/5 rounded-full text-black/40 font-medium">
              {viewMode === "daily" ? "日" : viewMode === "weekly" ? "週" : "月"}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSearch(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/60"
              title="タスクを検索"
            >
              <Search size={18} />
            </button>
            <button 
              onClick={cycleViewMode}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/60"
              title="ビュー切り替え（日→週→月）"
            >
              <CalendarIcon size={18} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/60"
              title="設定"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <DateNavigation selectedDate={selectedDate} viewMode={viewMode} onDateChange={setSelectedDate} />

        <CalendarView 
          tasks={tasks}
          viewMode={viewMode}
          selectedDate={selectedDate}
          startHour={calStartHour}
          endHour={calEndHour}
          onUpdateTask={handleUpdateTask}
          onCompleteTask={handleCompleteTask}
          onDeleteTask={handleDeleteTask}
          onDayClick={handleDayClick}
        />
      </div>
      
      {/* ドラッグ時にカーソルに吸い付くコンポーネント（滑らかな挙動用） */}
      <DragOverlay dropAnimation={dropAnimationConfig}>
        {activeTask ? (
          <div className="bg-[#fdfbf7] p-2 border border-black/10 rounded-sm shadow-xl opacity-90 rotate-2 cursor-grabbing w-[300px]">
            <span className="text-sm font-medium text-black/80">{activeTask.text || "タスク..."}</span>
          </div>
        ) : null}
      </DragOverlay>

      {/* 検索パネル */}
      {showSearch && (
        <SearchPanel 
          tasks={tasks} 
          onClose={() => setShowSearch(false)}
          onTaskClick={(task) => {
            setShowSearch(false);
            // タスクがスケジュール済みならDailyビューに切り替え
            if (task.scheduled_hour != null) {
              setViewMode("daily");
            }
          }}
        />
      )}

      {showSettings && (
        <SettingsPanel 
          onClose={() => setShowSettings(false)}
          startHour={calStartHour}
          endHour={calEndHour}
          onChangeHours={handleChangeHours}
        />
      )}
    </div>
    </DndContext>
  );
}
