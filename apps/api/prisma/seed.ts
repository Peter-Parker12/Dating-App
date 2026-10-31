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

interface Demo {
  name: string; slug: string; gender: "female" | "male"; age: number; price: number; style: string;
  langs: string[]; acts: string[]; district: string; sticker: string; bio: string; photos: number;
  now?: boolean; height: number;
}

// Fictional demo profiles; photos are Unsplash stock images in apps/web/public/photos.
const talents: Demo[] = [
  { name: "Minh Anh", slug: "minh-anh", gender: "female", age: 21, price: 150000, style: "Dịu dàng, năng động", langs: ["Tiếng Việt", "English"], acts: ["cafe", "study", "temple"], district: "Quận 3", sticker: "Về ra mắt nhà nha?", bio: "Thích cà phê sách và những buổi học nhóm yên tĩnh. Rất vui được đồng hành cùng bạn.", photos: 2, now: true, height: 160 },
  { name: "Gia Hân", slug: "gia-han", gender: "female", age: 22, price: 200000, style: "Thanh lịch", langs: ["Tiếng Việt", "English", "日本語"], acts: ["party", "family", "cafe"], district: "Quận 1", sticker: "Tâm sự tối nay?", bio: "Duyên dáng, biết quan sát và thấu hiểu. Sẵn sàng làm bạn đồng hành cho các buổi tiệc.", photos: 2, height: 164 },
  { name: "Quốc Bảo", slug: "quoc-bao", gender: "male", age: 23, price: 180000, style: "Thể thao, lịch sự", langs: ["Tiếng Việt", "English"], acts: ["gym", "cafe", "party"], district: "Thủ Đức", sticker: "Đi gym không?", bio: "Cùng chạy bộ, tập gym rồi làm ly cà phê chill. Năng lượng tích cực đảm bảo.", photos: 2, now: true, height: 175 },
  { name: "Thu Hà", slug: "thu-ha", gender: "female", age: 20, price: 120000, style: "Hiền, dễ gần", langs: ["Tiếng Việt"], acts: ["study", "cafe", "online-chat"], district: "Bình Thạnh", sticker: "Học bài cùng nhau!", bio: "Hay cười, dễ bắt chuyện. Cùng ôn thi ở thư viện hoặc tâm sự online đều ổn.", photos: 2, height: 158 },
  { name: "Đức Huy", slug: "duc-huy", gender: "male", age: 24, price: 250000, style: "Chững chạc", langs: ["Tiếng Việt", "English", "中文"], acts: ["family", "party", "temple"], district: "Phú Nhuận", sticker: "Ra mắt gia đình?", bio: "Lịch sự, chu đáo, quen với các sự kiện và buổi gặp gỡ trang trọng.", photos: 2, height: 178 },
  { name: "Bảo Ngọc", slug: "bao-ngoc", gender: "female", age: 21, price: 170000, style: "Cá tính, trẻ trung", langs: ["Tiếng Việt", "English"], acts: ["cafe", "party", "online-chat"], district: "Quận 7", sticker: "Cà phê nha!", bio: "Thích khám phá quán cà phê mới và những cuộc trò chuyện thú vị.", photos: 1, now: true, height: 162 },
  { name: "Khánh Linh", slug: "khanh-linh", gender: "female", age: 23, price: 220000, style: "Bí ẩn, nghệ sĩ", langs: ["Tiếng Việt", "English", "한국어"], acts: ["party", "cafe", "family"], district: "Quận 2", sticker: "Đi chơi tối nay?", bio: "Yêu âm nhạc và nhiếp ảnh. Cùng đi triển lãm hoặc một buổi tiệc nhỏ nhé.", photos: 1, height: 166 },
  { name: "Mỹ Duyên", slug: "my-duyen", gender: "female", age: 22, price: 260000, style: "Sang trọng, nhẹ nhàng", langs: ["Tiếng Việt", "English", "Français"], acts: ["party", "family"], district: "Quận 1", sticker: "Dự tiệc cùng mình!", bio: "Quen với các sự kiện, biết cách trò chuyện và tạo không khí dễ chịu.", photos: 1, height: 168 },
  { name: "Ngọc Trinh", slug: "ngoc-trinh", gender: "female", age: 20, price: 130000, style: "Ngọt ngào, vui vẻ", langs: ["Tiếng Việt"], acts: ["study", "cafe", "temple"], district: "Gò Vấp", sticker: "Đi chùa cầu an?", bio: "Thích đi chùa đầu tháng, học bài ở thư viện và uống trà sữa sau giờ học.", photos: 1, height: 157 },
  { name: "Phương Thảo", slug: "phuong-thao", gender: "female", age: 24, price: 190000, style: "Năng động, thích du lịch", langs: ["Tiếng Việt", "English"], acts: ["gym", "cafe", "online-chat"], district: "Quận 10", sticker: "Đi dạo nhé!", bio: "Mê leo núi, chạy bộ và những chuyến đi ngắn ngày. Dễ nói chuyện, dễ hợp vibe.", photos: 1, now: true, height: 165 },
  { name: "Hoài An", slug: "hoai-an", gender: "female", age: 25, price: 280000, style: "Ấm áp, tinh tế", langs: ["Tiếng Việt", "English"], acts: ["online-chat", "family", "temple"], district: "Quận 5", sticker: "Tâm sự tối nay?", bio: "Biết lắng nghe và chia sẻ. Phù hợp cho các buổi trò chuyện sâu hoặc gặp gia đình.", photos: 1, height: 163 },
  { name: "Tuấn Kiệt", slug: "tuan-kiet", gender: "male", age: 25, price: 300000, style: "Lịch lãm, chỉn chu", langs: ["Tiếng Việt", "English"], acts: ["party", "family", "cafe"], district: "Quận 1", sticker: "Ra mắt gia đình?", bio: "Phong thái chững chạc, quen với các buổi gặp đối tác và sự kiện công ty.", photos: 1, height: 180 },
  { name: "Minh Khoa", slug: "minh-khoa", gender: "male", age: 22, price: 140000, style: "Vui tính, thân thiện", langs: ["Tiếng Việt", "English"], acts: ["cafe", "study", "online-chat"], district: "Thủ Đức", sticker: "Học cùng nha!", bio: "Thích board game, cà phê và những buổi học nhóm vui vẻ.", photos: 1, now: true, height: 172 },
  { name: "Gia Bảo", slug: "gia-bao", gender: "male", age: 23, price: 160000, style: "Trầm tính, tử tế", langs: ["Tiếng Việt"], acts: ["gym", "temple", "cafe"], district: "Bình Thạnh", sticker: "Chạy bộ sáng mai?", bio: "Hay đi bộ buổi sáng, thích những quán cà phê yên tĩnh. Đáng tin cậy.", photos: 1, height: 174 },
  { name: "Hải Đăng", slug: "hai-dang", gender: "male", age: 26, price: 220000, style: "Mạnh mẽ, ga lăng", langs: ["Tiếng Việt", "English"], acts: ["gym", "party"], district: "Quận 7", sticker: "Tập gym cùng nhau!", bio: "Huấn luyện viên thể hình. Cùng tập luyện hoặc dự tiệc đều nhiệt tình.", photos: 1, height: 181 },
  { name: "Anh Tuấn", slug: "anh-tuan", gender: "male", age: 21, price: 110000, style: "Phóng khoáng, hài hước", langs: ["Tiếng Việt", "English"], acts: ["cafe", "party", "online-chat"], district: "Quận 3", sticker: "Đi cà phê nha?", bio: "Thích nhạc indie, chụp ảnh film và kể chuyện cười. Hợp đi chơi nhẹ nhàng.", photos: 1, now: true, height: 170 },
  { name: "Thành Long", slug: "thanh-long", gender: "male", age: 27, price: 270000, style: "Điềm đạm, sâu sắc", langs: ["Tiếng Việt", "English", "中文"], acts: ["family", "party", "temple"], district: "Quận 5", sticker: "Ra mắt gia đình?", bio: "Nói chuyện chừng mực, lễ phép với người lớn. Phù hợp các dịp gia đình.", photos: 1, height: 176 },
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
    const data = {
      displayName: t.name, gender: t.gender, age: t.age, hourlyPrice: t.price, style: t.style,
      languages: t.langs, activities: t.acts, heightCm: t.height, bio: t.bio, district: t.district,
      sticker: t.sticker, availableNow: t.now ?? false, availability: "Tối thứ 2-6, cả ngày cuối tuần",
      photos: Array.from({ length: t.photos }, (_, n) => `/photos/${t.slug}-${n + 1}.jpg`),
    };
    await prisma.talentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  }
}

main().finally(() => prisma.$disconnect());
