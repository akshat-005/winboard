# WINBOARD

A personal win-tracker: log daily habits, real-world outcomes, and "clutch" moments
where you fought instead of folding. Every win has a tier (Bronze/Silver/Gold) and
points, and the app tracks your streaks so winning becomes the daily default again.

This is a real React app with a Supabase backend (Postgres + auth), so your data
syncs across your phone and PC automatically once deployed — no Claude account or
plan involved.

## 1. Create your Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is enough).
2. Click **New project**. Pick any name/region, set a database password (save it
   somewhere), and wait ~2 minutes for it to provision.
3. In your new project, go to **SQL Editor > New query**, paste the entire contents
   of `supabase/schema.sql` from this folder, and click **Run**. This creates the
   `habits` and `wins` tables with row-level security, so only you can ever see
   your own rows.
4. Go to **Project Settings > API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key

## 2. Configure the app

1. In this project folder, copy `.env.example` to a new file named `.env`.
2. Paste in your Project URL and anon key:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. By default, Supabase requires email confirmation for new accounts. For a
   personal app this is unnecessary friction — to turn it off: **Authentication >
   Providers > Email**, and toggle off "Confirm email." (Optional — leave it on if
   you'd rather have that extra step.)

## 3. Run it locally to confirm it works

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Sign up with any email
and password, and you should land on your board.

## 4. Deploy it so it works on any device

1. Push this folder to a new GitHub repository (create one at github.com/new, then
   `git init`, `git add .`, `git commit -m "winboard"`, `git remote add origin <your-repo-url>`,
   `git push -u origin main`).
2. Go to [vercel.com](https://vercel.com), sign up with your GitHub account, click
   **Add New > Project**, and import the repo you just pushed.
3. Vercel will auto-detect this as a Vite project. Before deploying, open
   **Environment Variables** and add the same two values from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. You'll get a real URL like `winboard-yourname.vercel.app`.

That URL works identically on your phone's browser and your PC — sign in with the
same account on both, and your wins, streaks, and habits stay in sync because
they're all reading from the same Supabase database. On your phone, use "Add to
Home Screen" from your browser's share menu so it opens like an app.

## How it's organized

- `src/lib/winLogic.js` — all the pure logic: points, streaks, "fought back"
  detection, the 14-day chart data. No UI code here, easy to test or tweak.
- `src/components/Today.jsx` — log habit wins (one tap), outcome wins, and clutch
  wins; shows today's running list.
- `src/components/Habits.jsx` — add/edit/archive recurring habits and their
  default tier.
- `src/components/Stats.jsx` — 14-day bar chart, per-habit streaks, the clutch win
  log (read back your fight-back moments), and a reset option.
- `src/components/FlipCounter.jsx` — the scoreboard-style flip animation for the
  points tally.
- `supabase/schema.sql` — the two tables and the security policies that keep your
  data private to your account.

## Extending it later

The data model already separates `habits` and `wins` cleanly with a `user_id` on
every row, so adding things later — a friend leaderboard, a weekly summary email,
a mobile-native wrapper — won't require restructuring the database. Row-level
security is scoped per-user already; a shared/leaderboard feature would just need
a new table with its own (more permissive) policy, not changes to these two.
