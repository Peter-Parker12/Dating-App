# Cùng Đi

Companion-booking web app (Vietnamese/English). Customers browse verified Talents, send booking requests,
and chat after the Talent accepts. Chat masks phone numbers, links and off-platform keywords. Includes SOS alerts
and an admin dashboard for ID review. Payments are intentionally not included yet.

Stack: Next.js (apps/web), Fastify + Prisma + Socket.IO (apps/api), Postgres.

## Local development
```bash
npm install
export DATABASE_URL=postgresql://user@localhost:5432/cungdi
npm -w apps/api exec prisma migrate dev
DEMO_PASSWORD=demo12345 npm -w apps/api run db:seed   # admin@cungdi.local / change-me-admin + 41 demo talents
npm run dev:api    # :4000
npm run dev:web    # :3000 (proxies /api and /socket.io to the API)
npm test
```

## Profiles
**Talents** list the activities they offer and a weekly availability grid (7 days x morning/afternoon/evening),
plus an optional note. Explore can filter by the day a talent is free. **Customers** can say what they are looking
for (activities and a short note); approved talents see these in the "Looking for" list, with only the given name,
province, activities and note (never full name, phone, email or address). Customers who leave it empty are not listed.
Prices per service or session are intentionally not included yet.

## Account verification (KYC)
New accounts are `PENDING`: they can view profiles, and nothing else, until an admin approves them.
To apply, a user verifies their email and phone (6-digit codes), then uploads an ID photo, student card and
profile image. Admins review the submission under **Admin > KYC** and approve or reject (with a reason);
rejected users can resubmit. Users get an in-app notification and an email on every status change. Admins are
exempt, and the SOS button works for everyone.

**Roles:** admins can make any active user with a verified email a *moderator* (Admin > Users). Moderators can
review and approve or reject verification submissions and nothing else (no SOS, user management or settings),
and, like admins, they skip KYC themselves. They can't review their own submission.

**Email settings:** admins configure SMTP in the UI under Admin > Email settings (host, port, user, password, sender,
with a "send test email" button). The password is encrypted at rest (AES-256-GCM, key from `SETTINGS_KEY`, falling
back to `JWT_SECRET`: keep it stable, or saved passwords become unreadable) and is never returned by the API.
Settings saved there override the `SMTP_*` environment variables. SMS still uses the Twilio variables.

Delivery needs configuring in `.env` (see `.env.example`) or in the admin UI: SMTP for email, Twilio for SMS. Without them,
codes and notifications are only written to the API log, which is fine for development but means real users
cannot verify. Demo profiles are seeded as already approved.

## Deploy (VPS, Docker)
```bash
cp .env.example .env   # fill in secrets
docker compose up -d --build         # app on host port 2829
```
Cloudflare Tunnel runs on the VPS itself: point its public hostname at `http://localhost:2829`.
Consider binding the port to loopback (`127.0.0.1:2829:2829` in compose) so only the tunnel can reach it.

## Credits
Demo profile photos in `apps/web/public/photos` are Unsplash stock images (Unsplash License).
