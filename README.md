# Cafe QR Ordering System

Modern QR-based cafe ordering app built with React + Vite + Supabase.

## Quick start

1. Install dependencies
   - `npm install`
2. Configure environment
   - Copy `.env.example` to `.env`
   - Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Start dev server
   - `npm run dev`

## Fix for QR error: "unable to create a session"

If scanning QR fails with session creation errors, your Supabase RLS policies are blocking customer inserts.

Apply SQL migration:
- `supabase/001_fix_customer_session_rls.sql`

Run it in Supabase SQL Editor, then retry QR scan.

## Production checklist

- [ ] Set correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Apply `supabase/001_fix_customer_session_rls.sql`
- [ ] Rotate any leaked keys (if shared in scripts/history)
- [ ] Enable HTTPS and custom domain
- [ ] Configure Supabase backups and alerts
- [ ] Review RLS policies with least-privilege rules
- [ ] Remove/lock debug scripts before release

## Build

- `npm run build`
- `npm run preview`

## Notes

- Customer entry is `/order` (or `/` which routes to QR validation)
- Admin login is `/admin/login`
