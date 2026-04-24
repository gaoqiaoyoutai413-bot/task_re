"use client";
import React, { useState } from "react";
import { X, LogOut, Clock, Bell, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SettingsPanelProps {
  onClose: () => void;
  startHour: number;
  endHour: number;
  onChangeHours: (start: number, end: number) => void;
}

export function SettingsPanel({ onClose, startHour, endHour, onChangeHours }: SettingsPanelProps) {
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestEmail = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/daily-digest");
      const json = await res.json();
      if (json.success) {
        const sent = json.results?.filter((r: any) => r.status === "sent").length || 0;
        setTestResult(`✅ ${sent}件のメールを送信しました`);
      } else {
        setTestResult(`❌ ${json.error || "送信失敗"}`);
      }
    } catch (e: any) {
      setTestResult(`❌ ${e.message}`);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#fdfbf7]/95 backdrop-blur-sm flex flex-col p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif text-black/70">設定</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-black/40 hover:text-black/60">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* 表示時間の範囲 */}
        <div className="rounded-lg border border-black/10 p-4 bg-white/50">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-black/40" />
            <span className="text-sm font-medium text-black/60">表示時間の範囲</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-black/40">開始</label>
              <select
                value={startHour}
                onChange={e => onChangeHours(parseInt(e.target.value), endHour)}
                className="text-sm border border-black/10 rounded px-2 py-1 bg-transparent text-black/60"
              >
                {Array.from({ length: 12 }, (_, i) => i + 5).map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>
            <span className="text-black/30">〜</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-black/40">終了</label>
              <select
                value={endHour}
                onChange={e => onChangeHours(startHour, parseInt(e.target.value))}
                className="text-sm border border-black/10 rounded px-2 py-1 bg-transparent text-black/60"
              >
                {Array.from({ length: 12 }, (_, i) => i + 14).map(h => (
                  <option key={h} value={h}>{h}:00</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 通知設定 */}
        <div className="rounded-lg border border-black/10 p-4 bg-white/50">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} className="text-black/40" />
            <span className="text-sm font-medium text-black/60">毎朝のタスク通知</span>
          </div>
          <p className="text-xs text-black/40 mb-3 leading-relaxed">
            毎朝7:00に未完了タスクの一覧をメールで受け取れます。<br />
            チェックのついていないタスクとスケジュール済みのタスクが一覧で届きます。
          </p>
          <button
            onClick={handleTestEmail}
            disabled={testSending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-black/10 rounded-lg text-black/60 hover:bg-black/5 transition-colors text-sm disabled:opacity-50"
          >
            <Bell size={14} />
            {testSending ? "送信中..." : "テストメールを送信"}
          </button>
          {testResult && (
            <p className="text-xs mt-2 text-center text-black/50">{testResult}</p>
          )}
        </div>

        {/* アプリ情報 */}
        <div className="rounded-lg border border-black/10 p-4 bg-white/50">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={14} className="text-black/40" />
            <span className="text-sm font-medium text-black/60">アプリ情報</span>
          </div>
          <div className="text-xs text-black/40 space-y-1">
            <div>Analog-Digital Task v0.3.0</div>
            <div>紙の手帳の質感とデジタルの効率性を融合</div>
          </div>
        </div>

        {/* ログアウト */}
        <button
          onClick={async () => {
            localStorage.removeItem('provider_token');
            await supabase.auth.signOut();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 rounded-lg text-red-400 hover:bg-red-50 transition-colors text-sm"
        >
          <LogOut size={14} />
          ログアウト
        </button>
      </div>
    </div>
  );
}
