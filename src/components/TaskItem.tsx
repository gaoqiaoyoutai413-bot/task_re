"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { HandwritingCanvas } from "./HandwritingCanvas";
import { PenTool, GripVertical, Circle, CheckCircle2, Trash2 } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";

export type Task = {
  id: string;
  text: string;
  completed: boolean;
  scheduled_hour?: number | null;
  scheduled_duration?: number | null;
  handwriting_data?: any;
  google_event_id?: string | null;
};

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onUpdate, onComplete, onDelete }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const draggableStyle = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

  return (
    <motion.div layout className="mb-2 w-full relative" ref={setNodeRef} style={draggableStyle}>
      <div className="relative z-10 w-full group bg-[#fdfbf7]">
        <div 
          className="flex flex-col border-b border-black/5 hover:bg-black/[0.02] transition-colors rounded-sm shadow-sm border border-black/5"
        >
          <div className="h-10 flex items-center px-1">
            <div 
              {...listeners} 
              {...attributes} 
              className="cursor-grab hover:text-black/60 text-black/20 mr-1 touch-none p-1"
            >
              <GripVertical size={16} />
            </div>
            
            <button 
              onClick={() => onComplete(task.id, !task.completed)}
              className="mr-2 text-black/30 hover:text-black/60 transition-colors p-1"
            >
              {task.completed ? <CheckCircle2 size={18} className="text-black/60" /> : <Circle size={18} />}
            </button>

            {/* この部分をスワイプすると完了扱いになるようにドラッグ領域を設定 */}
            <div className="flex-1 flex items-center relative">
              {/* テキストと同じ幅になる非表示のSpanで取り消し線の幅を制御する */}
              <div className="absolute left-0 top-0 bottom-0 flex items-center pointer-events-none">
                <span className="invisible whitespace-pre font-medium text-sm">
                  {task.text || ' '}
                </span>
                <AnimatePresence>
                  {task.completed && (
                    <motion.div 
                      className="absolute left-0 right-0 h-0.5 visible opacity-80 mix-blend-multiply"
                      style={{ backgroundColor: "var(--color-ink-blue)", filter: "url(#ink)" }}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  )}
                </AnimatePresence>
              </div>

              <input
                type="text"
                value={task.text}
                onChange={(e) => onUpdate(task.id, { text: e.target.value })}
                className={`w-full bg-transparent outline-none font-medium placeholder:text-black/30 text-sm pointer-events-auto transition-colors ${task.completed ? 'text-black/30' : 'text-black/80'}`}
                placeholder="新しいタスク..."
              />
            </div>
            
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-black/30 hover:text-black/60 focus:opacity-100 p-2 ml-2"
              title="メモを追加"
            >
              <PenTool size={14} />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/50 hover:text-red-600/80 focus:opacity-100 p-2"
              title="タスクを削除"
            >
              <Trash2 size={14} />
            </button>
          </div>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 200, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="overflow-hidden bg-black/5 rounded-b-sm border-t border-black/5 border-dashed"
              >
                <div className="h-[200px] w-full p-2 relative">
                  <HandwritingCanvas 
                    initialStrokes={task.handwriting_data}
                    onSave={(data) => onUpdate(task.id, { handwriting_data: data })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
