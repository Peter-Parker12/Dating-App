import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const activities = [
  ["cafe", "Cà phê", "Coffee"],
  ["study", "Học cùng", "Study together"],
  ["temple", "Đi chùa", "Temple visit"],
  ["party", "Dự tiệc", "Party"],
  ["family", "Ra mắt gia đình", "Meet the family"],
  ["gym", "Tập gym", "Gym"],
  ["online-chat", "Tâm sự online", "Online chat"],
];

const talents = [
  { name: "Minh Anh", gender: "female", age: 21, price: 150000, style: "Dịu dàng, năng động", langs: ["Tiếng Việt", "English"], acts: ["cafe", "study", "temple"] },
  { name: "Gia Hân", gender: "female", age: 22, price: 200000, style: "Thanh lịch", langs: ["Tiếng Việt", "English", "日本語"], acts: ["party", "family", "cafe"] },
  { name: "Quốc Bảo", gender: "male", age: 23, price: 180000, style: "Thể thao, lịch sự", langs: ["Tiếng Việt", "English"], acts: ["gym", "cafe", "party"] },
  { name: "Thu Hà", gender: "female", age: 20, price: 120000, style: "Hiền, dễ gần", langs: ["Tiếng Việt"], acts: ["study", "cafe", "online-chat"] },
  { name: "Đức Huy", gender: "male", age: 24, price: 250000, style: "Chững chạc", langs: ["Tiếng Việt", "English", "中文"], acts: ["family", "party", "temple"] },
];

async function main() {
  for (const [slug, nameVi, nameEn] of activities)
    await prisma.activity.upsert({ where: { slug }, create: { slug, nameVi, nameEn }, update: { nameVi, nameEn } });

  const adminPw = process.env.ADMIN_PASSWORD ?? "change-me-admin";
  const admin = process.env.ADMIN_EMAIL ?? "admin@cungdi.local";
  await prisma.user.upsert({
    where: { email: admin },
    create: { email: admin, name: "Admin", role: "ADMIN", passwordHash: await argon2.hash(adminPw) },
    update: {},
  });

  if (process.env.SEED_DEMO === "false") return;
  const pw = await argon2.hash("demo12345");
  for (const [i, t] of talents.entries()) {
    const email = `talent${i + 1}@cungdi.local`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: t.name, role: "TALENT", passwordHash: pw, idStatus: "APPROVED" },
      update: {},
    });
    await prisma.talentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, displayName: t.name, gender: t.gender, age: t.age, hourlyPrice: t.price,
        style: t.style, languages: t.langs, activities: t.acts, photos: [], heightCm: 160 + i * 4,
        bio: "Xin chào! Mình thích gặp gỡ và trò chuyện. / Hi! I enjoy meeting new people.",
        availability: "Tối thứ 2-6, cả ngày cuối tuần",
      },
      update: {},
    });
  }
}

main().finally(() => prisma.$disconnect());
