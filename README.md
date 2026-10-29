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
SEED_DEMO=true npm -w apps/api run db:seed   # admin@cungdi.local / change-me-admin + demo talents
npm run dev:api    # :4000
npm run dev:web    # :3000 (proxies /api and /socket.io to the API)
npm test
```

## Deploy (VPS, Docker)
```bash
cp .env.example .env   # fill in secrets
docker compose up -d --build         # app on host port 2829
```
Cloudflare Tunnel runs on the VPS itself: point its public hostname at `http://localhost:2829`.
Consider binding the port to loopback (`127.0.0.1:2829:2829` in compose) so only the tunnel can reach it.

## Credits
Demo profile photos in `apps/web/public/photos` are Unsplash stock images (Unsplash License).
