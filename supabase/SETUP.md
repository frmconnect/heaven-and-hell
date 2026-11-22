# Switching on the online leaderboard (Supabase) — owner steps

Takes about 5 minutes on a phone. Free plan; no card needed.

1. Go to **supabase.com** → **Start your project** → sign in with **GitHub** (same account as the game).
2. **New project**: name it `heaven-and-hell`, make up a database password (you won't need it again — keep it somewhere safe), pick the region closest to you, **Free** plan → **Create new project**. Wait ~1 minute.
3. Left menu → **SQL Editor** → **New query**. Paste everything from `supabase/setup.sql` (Claude sends it to you), tap **Run**. It should say "Success".
4. Left menu → **Project Settings** (gear) → **API** (or "Data API"). Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (a long text starting with `eyJ…`, or `sb_publishable_…`)
5. Send those two to Claude. They are **public** values (they're built into the game for every player), so it's fine to paste them in chat.
   **Never** send the `service_role` / secret key or the database password.
