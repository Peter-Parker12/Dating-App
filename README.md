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

## Deploy (VPS, Docker, Cloudflare Tunnel)
```bash
cp .env.example .env   # fill in secrets
docker compose up -d --build         # app on host port 2829
docker compose --profile tunnel up -d   # adds cloudflared
```
In Cloudflare Zero Trust, create a tunnel, set its public hostname service to `http://proxy:2829`,
and put the tunnel token in `CLOUDFLARE_TUNNEL_TOKEN`. Only port 2829 is published; bind it to
127.0.0.1 in compose if the tunnel is the only way in.
