"use client";

import React from "react";
import { TaskItem, Task } from "./TaskItem";
import { LayoutGroup, motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";

interface TaskListProps {
  tasks: Task[];
  onAddTask: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onCompleteTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  loading: boolean;
}

export function TaskList({ tasks, onAddTask, onUpdateTask, onCompleteTask, onDeleteTask, loading }: TaskListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned-tasks"
  });

  if (loading) return <div className="text-black/30 p-4 text-sm font-serif italic">Loading tasks...</div>;

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col h-full w-full min-h-[200px] transition-colors rounded-lg ${isOver ? 'bg-black/[0.03] outline-dashed outline-2 outline-black/10 outline-offset-4' : ''}`}
    >
      <LayoutGroup>
        <motion.div layout className="flex-1 w-full relative">
          {tasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onUpdate={onUpdateTask} 
              onComplete={onCompleteTask} 
              onDelete={onDeleteTask}
            />
          ))}
          
          <motion.button 
            layout
            onClick={onAddTask}
            className="w-full text-left py-2 px-8 text-black/30 hover:text-black/60 transition-colors text-sm font-medium mt-2 focus:outline-none"
          >
            + 新しいタスクを追加
          </motion.button>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
