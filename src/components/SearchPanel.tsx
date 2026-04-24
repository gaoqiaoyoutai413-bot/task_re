"use client";
import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { Task } from "./TaskItem";

interface SearchPanelProps {
  tasks: Task[];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

export function SearchPanel({ tasks, onClose, onTaskClick }: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? tasks.filter(t =>
        t.text.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="absolute inset-0 z-50 bg-[#fdfbf7]/95 backdrop-blur-sm flex flex-col p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Search size={18} className="text-black/30" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="タスクを検索..."
          className="flex-1 bg-transparent border-b border-black/15 focus:border-black/40 outline-none text-sm font-serif py-2 text-black/70 placeholder:text-black/25 transition-colors"
          autoFocus
        />
        <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-black/40 hover:text-black/60">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {query.trim() && filtered.length === 0 && (
          <div className="text-center text-black/30 text-sm font-serif italic mt-12">
            「{query}」に一致するタスクはありません
          </div>
        )}

        {!query.trim() && (
          <div className="text-center text-black/25 text-sm font-serif italic mt-12">
            キーワードを入力して検索
          </div>
        )}

        {filtered.map(task => (
          <button
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="w-full text-left px-3 py-2.5 hover:bg-black/5 rounded-sm transition-colors border-b border-black/5 flex items-center gap-3"
          >
            <div className={`w-3 h-3 rounded-full border ${task.completed ? "bg-black/40 border-black/40" : "border-black/20"}`} />
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${task.completed ? "line-through text-black/30" : "text-black/70"}`}>
                {task.text || "（空のタスク）"}
              </span>
              {task.scheduled_hour != null && (
                <span className="text-[10px] text-black/30 ml-2">
                  {Math.floor(task.scheduled_hour)}:{task.scheduled_hour % 1 !== 0 ? "30" : "00"}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="text-[10px] text-black/25 text-center mt-2 pt-2 border-t border-black/5">
        {tasks.length}件のタスク（完了済み含む）
      </div>
    </div>
  );
}
