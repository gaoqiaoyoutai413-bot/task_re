# Analog-Digital Task

紙の手帳のような見た目で、日々のタスク管理とスケジュール整理をまとめて行うためのアプリです。  
タスクを一覧で管理しながら、Google カレンダー上の予定も同じ画面で確認できるように設計されています。

Next.js 16、React 19、Supabase、Google OAuth、Resend を使って構成されています。

## できること

- タスクの追加、編集、完了、削除
- 未割り当てタスクをドラッグして時間枠に配置
- 日表示、週表示、月表示の切り替え
- Google カレンダーの予定取得
- タスクを Google カレンダー予定として追加、削除
- Supabase を使ったユーザー認証とデータ保存
- Resend を使った日次タスクリマインドメール送信

## 画面イメージ

アプリは大きく 2 カラム構成です。

- 左側: その日の未割り当てタスク一覧
- 右側: スケジュール表示と Google カレンダー連携領域

紙のノートのような質感を意識した UI になっており、タスクを「書く」「並べる」「時間に置く」という感覚で使えるようになっています。

## 使用技術

- Next.js 16
- React 19
- TypeScript
- Supabase
- Google OAuth
- Resend
- dnd-kit
- Tailwind CSS 4
- Framer Motion

## セットアップ手順

### 1. 依存関係をインストール

```bash
npm install
```

### 2. 環境変数ファイルを作成

公開用の雛形ファイルから `.env.local` を作成します。

```bash
cp .env.example .env.local
```

### 3. `.env.local` に値を設定

以下の環境変数が必要です。

- `NEXT_PUBLIC_SUPABASE_URL`
  Supabase プロジェクト URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  クライアント側から利用する公開用 anon key
- `SUPABASE_SERVICE_ROLE_KEY`
  サーバー側で管理操作に使う秘密鍵
- `RESEND_API_KEY`
  メール送信用の Resend API キー
- `RESEND_FROM_EMAIL`
  送信元メールアドレス
- `CRON_SECRET`
  日次メール API を保護するための秘密文字列

例:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-public-anon-key"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="Task App <noreply@example.com>"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
CRON_SECRET="generate-a-long-random-secret"
```

## ローカル起動

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いて確認します。

## 認証とデータ保存

このアプリは Supabase 認証を利用してログイン状態を管理します。  
Google ログインを通してカレンダー連携用トークンを取得し、Google カレンダーの予定取得や予定作成に利用します。

主なポイント:

- クライアント側では `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を利用
- サーバー側では `SUPABASE_SERVICE_ROLE_KEY` を利用
- `SUPABASE_SERVICE_ROLE_KEY` は絶対に公開しない

## 日次メール送信について

`/api/daily-digest` という Route Handler を使って、各ユーザーにその日の未完了タスク一覧を送信します。

このエンドポイントは以下の条件で保護されています。

- `CRON_SECRET` が未設定の場合は実行不可
- `Authorization: Bearer <CRON_SECRET>` ヘッダーが一致しない場合は `401 Unauthorized`

`vercel.json` には以下の cron 設定が入っています。

- 毎日 `0 22 * * *` に `/api/daily-digest` を実行

実際にデプロイ先で動かす場合は、cron 側から `Authorization` ヘッダーを付けられるように設定してください。

## デプロイ

Vercel などのホスティング環境にデプロイする場合は、`.env.local` と同じ値を環境変数として登録してください。

基本的な流れ:

1. GitHub に push
2. Vercel などにリポジトリを接続
3. 必要な環境変数を登録
4. Google OAuth と Supabase の設定を本番ドメインに合わせて更新
5. Cron 実行時の認証設定を確認

## public リポジトリ化するときの注意

このリポジトリは public にできますが、秘密情報の扱いは必ず確認してください。

- `.env.local` は commit しない
- `.env*` に実鍵を入れたまま共有しない
- `SUPABASE_SERVICE_ROLE_KEY` は秘密情報として厳重に管理する
- `RESEND_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`CRON_SECRET` は漏えいが疑われたらすぐローテーションする
- `NEXT_PUBLIC_*` の値はブラウザに公開される前提で扱う

## よく使うコマンド

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 補足

現状のコードベースには README 更新とは別に lint 指摘が残っている箇所があります。  
public 公開や動作確認には直結しませんが、今後整備すると保守しやすくなります。

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Documentation](https://resend.com/docs)
