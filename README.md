Task planning app built with Next.js, Supabase, Google OAuth, and Resend.

## Setup

Copy the example env file and fill in your own values.

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Public Repository Safety

- Do not commit `.env.local` or any other `.env*` file containing real secrets.
- `NEXT_PUBLIC_*` values are exposed to the browser by design.
- Rotate any secret immediately if it was ever committed or shared.
- The `/api/daily-digest` route requires `Authorization: Bearer $CRON_SECRET`.

## Deploy

Set the same environment variables in your hosting platform before deploying. If you use Vercel Cron Jobs, configure the cron request to send the `Authorization` header with your `CRON_SECRET`.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Documentation](https://resend.com/docs)
