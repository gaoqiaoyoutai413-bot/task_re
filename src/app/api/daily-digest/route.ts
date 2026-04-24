import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

type DigestTask = {
  text: string | null;
  scheduled_hour: number | null;
};

type DigestResult = {
  email: string;
  status: string;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createClient(url, key);
}

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // 秘密が未設定のまま公開されても無防備にならないよう、未設定時は失敗させる
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }
    const resend = new Resend(resendKey);
    const supabase = getSupabaseAdmin();

    // 全ユーザーの未完了タスクを取得
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // auth.usersからユーザー一覧を取得
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      return NextResponse.json({ error: `Users fetch error: ${usersError.message}` }, { status: 500 });
    }

    const results: DigestResult[] = [];

    for (const user of usersData.users) {
      if (!user.email) continue;

      // このユーザーの未完了タスク（今日以前のもの）
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .lte("target_date", todayStr)
        .order("created_at", { ascending: true });

      if (tasksError || !tasks || tasks.length === 0) {
        results.push({ email: user.email, status: "no tasks" });
        continue;
      }

      // タスクを分類
      const scheduledTasks = tasks.filter(t => t.scheduled_hour != null);
      const unscheduledTasks = tasks.filter(t => t.scheduled_hour == null);

      // メール本文を生成
      const emailHtml = generateDigestEmail(todayStr, unscheduledTasks, scheduledTasks);

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "Task App <onboarding@resend.dev>",
          to: user.email,
          subject: `📋 今日のタスク (${tasks.length}件) - ${todayStr}`,
          html: emailHtml,
        });
        results.push({ email: user.email, status: "sent" });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown email error";
        results.push({ email: user.email, status: `error: ${message}` });
      }
    }

    return NextResponse.json({
      success: true,
      date: todayStr,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateDigestEmail(
  date: string,
  unscheduledTasks: DigestTask[],
  scheduledTasks: DigestTask[]
): string {
  const formatTime = (hour: number) => {
    const h = Math.floor(hour);
    const m = hour % 1 !== 0 ? "30" : "00";
    return `${h}:${m}`;
  };

  const taskRows = (tasks: DigestTask[], showTime: boolean) =>
    tasks
      .map(t => {
        const timeLabel = showTime && t.scheduled_hour != null
          ? `<span style="color:#888;font-size:12px;margin-right:8px;">${formatTime(t.scheduled_hour)}</span>`
          : "";
        return `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0ede7;">
              <span style="display:inline-block;width:14px;height:14px;border:2px solid #ccc;border-radius:3px;margin-right:10px;vertical-align:middle;"></span>
              ${timeLabel}
              <span style="color:#333;font-size:14px;">${t.text || "（タスク名なし）"}</span>
            </td>
          </tr>`;
      })
      .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f3ef;font-family:'Hiragino Sans','Noto Sans JP',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;color:#333;font-weight:600;margin:0;">📋 Today's Tasks</h1>
      <p style="font-size:13px;color:#999;margin:8px 0 0;">${date}</p>
    </div>

    <!-- Card -->
    <div style="background:#fdfbf7;border-radius:12px;border:1px solid #e8e3d8;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      
      ${unscheduledTasks.length > 0 ? `
      <!-- Unscheduled Tasks -->
      <div style="padding:16px 16px 8px;">
        <h2 style="font-size:13px;color:#888;font-weight:600;margin:0 0 8px;letter-spacing:1px;">TO DO</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${taskRows(unscheduledTasks, false)}
      </table>
      ` : ""}

      ${scheduledTasks.length > 0 ? `
      <!-- Scheduled Tasks -->
      <div style="padding:16px 16px 8px;${unscheduledTasks.length > 0 ? "border-top:2px solid #f0ede7;" : ""}">
        <h2 style="font-size:13px;color:#888;font-weight:600;margin:0 0 8px;letter-spacing:1px;">SCHEDULED</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${taskRows(scheduledTasks, true)}
      </table>
      ` : ""}

    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:11px;color:#bbb;">Analog-Digital Task App</p>
    </div>
  </div>
</body>
</html>`;
}
