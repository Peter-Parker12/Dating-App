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

## Photos
Every user can have one **profile photo** and a **gallery** of up to 6 photos (Profile page; talents also on their
dashboard). They are separate from the private verification documents. Photos are shrunk in the browser and uploaded
in parallel. Talents' photos are public (the listing is public); customers' photos are visible only to logged-in,
approved members, never to anonymous visitors. Photos go live immediately for approved accounts. Anyone can report a
photo; admins and moderators review reported (or recent) photos under Admin > Photo moderation and can remove one with a
reason, which notifies the owner by email and in-app. Removed photos disappear for everyone except the owner and staff.

## Bookings
A customer sends a request (activity, date, start time, hours, public place) to an approved talent, who accepts or
declines. Chat opens once a booking is accepted. Rules enforced by the API: only approved, active talents can be
booked; a start time in the past is refused; a customer cannot send overlapping requests to the same talent; a talent
cannot accept two overlapping bookings; and a booking can only be marked completed after it has started, which is what
unlocks reviews. Times are Vietnam local time (UTC+7). Every step notifies the other person in-app, and by email for
booking events (new request, accepted, declined, cancelled, completed); reviews and replies are in-app only.

## Account verification (KYC)
New accounts are `PENDING`: they can view profiles, and nothing else, until an admin approves them.
To apply, a user verifies their email or their phone (either one is enough; 6-digit codes), then uploads an ID photo,
student card and profile image. Each photo is shrunk in the browser (1600 px, JPEG) and uploaded on its own, in the
background and in parallel, as soon as it is chosen; the user can press submit at any time and keep browsing while the
remaining uploads finish (the request is sent automatically when the last one completes, so the tab must stay open).
Submitting only flips the status, and notification emails are sent in the background so a slow mail server never
holds up a request. Admins review the submission under **Admin > KYC** and approve or reject (with a reason);
rejected users can resubmit. Users get an in-app notification and an email on every status change. Admins are
exempt, and the SOS button works for everyone.

**Roles:** admins can make any active user with a verified email a *moderator* (Admin > Users). Moderators can
review and approve or reject verification submissions and nothing else (no SOS, user management or settings),
and, like admins, they skip KYC themselves. They can't review their own submission.

**Email settings:** admins configure SMTP in the UI under Admin > Email settings (host, port, user, password, sender,
with a "send test email" button). The password is encrypted at rest (AES-256-GCM, key from `SETTINGS_KEY`, falling
back to `JWT_SECRET`: keep it stable, or saved passwords become unreadable) and is never returned by the API.
Settings saved there override the `SMTP_*` environment variables. SMS still uses the Twilio variables.

Delivery needs configuring in `.env` (see `.env.example`) or in the admin UI: SMTP for email, Twilio for SMS.
Configure at least SMTP: users only need to verify one of email or phone, so email alone is enough to get started.
With neither configured, codes and notifications are only written to the API log, which is fine for development but
means real users cannot verify. Demo profiles are seeded as already approved.

## Deploy (VPS, Docker)
```bash
cp .env.example .env   # fill in secrets
docker compose up -d --build         # app on host port 2829
```
Cloudflare Tunnel runs on the VPS itself: point its public hostname at `http://localhost:2829`.
Consider binding the port to loopback (`127.0.0.1:2829:2829` in compose) so only the tunnel can reach it.

## Credits
Demo profile photos in `apps/web/public/photos` are Unsplash stock images (Unsplash License).
