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
  { name: "Bảo Ngọc", slug: "bao-ngoc", gender: "female", age: 21, price: 170000, style: "Cá tính, trẻ trung", langs: ["Tiếng Việt", "English"], acts: ["cafe", "party", "online-chat"], district: "Quận 7", sticker: "Cà phê nha!", bio: "Thích khám phá quán cà phê mới và những cuộc trò chuyện thú vị.", photos: 2, now: true, height: 162 },
  { name: "Khánh Linh", slug: "khanh-linh", gender: "female", age: 23, price: 220000, style: "Bí ẩn, nghệ sĩ", langs: ["Tiếng Việt", "English", "한국어"], acts: ["party", "cafe", "family"], district: "Quận 2", sticker: "Đi chơi tối nay?", bio: "Yêu âm nhạc và nhiếp ảnh. Cùng đi triển lãm hoặc một buổi tiệc nhỏ nhé.", photos: 2, height: 166 },
  { name: "Mỹ Duyên", slug: "my-duyen", gender: "female", age: 22, price: 260000, style: "Sang trọng, nhẹ nhàng", langs: ["Tiếng Việt", "English", "Français"], acts: ["party", "family"], district: "Quận 1", sticker: "Dự tiệc cùng mình!", bio: "Quen với các sự kiện, biết cách trò chuyện và tạo không khí dễ chịu.", photos: 1, height: 168 },
  { name: "Ngọc Trinh", slug: "ngoc-trinh", gender: "female", age: 20, price: 130000, style: "Ngọt ngào, vui vẻ", langs: ["Tiếng Việt"], acts: ["study", "cafe", "temple"], district: "Gò Vấp", sticker: "Đi chùa cầu an?", bio: "Thích đi chùa đầu tháng, học bài ở thư viện và uống trà sữa sau giờ học.", photos: 2, height: 157 },
  { name: "Phương Thảo", slug: "phuong-thao", gender: "female", age: 24, price: 190000, style: "Năng động, thích du lịch", langs: ["Tiếng Việt", "English"], acts: ["gym", "cafe", "online-chat"], district: "Quận 10", sticker: "Đi dạo nhé!", bio: "Mê leo núi, chạy bộ và những chuyến đi ngắn ngày. Dễ nói chuyện, dễ hợp vibe.", photos: 1, now: true, height: 165 },
  { name: "Hoài An", slug: "hoai-an", gender: "female", age: 25, price: 280000, style: "Ấm áp, tinh tế", langs: ["Tiếng Việt", "English"], acts: ["online-chat", "family", "temple"], district: "Quận 5", sticker: "Tâm sự tối nay?", bio: "Biết lắng nghe và chia sẻ. Phù hợp cho các buổi trò chuyện sâu hoặc gặp gia đình.", photos: 2, height: 163 },
  { name: "Tuấn Kiệt", slug: "tuan-kiet", gender: "male", age: 25, price: 300000, style: "Lịch lãm, chỉn chu", langs: ["Tiếng Việt", "English"], acts: ["party", "family", "cafe"], district: "Quận 1", sticker: "Ra mắt gia đình?", bio: "Phong thái chững chạc, quen với các buổi gặp đối tác và sự kiện công ty.", photos: 2, height: 180 },
  { name: "Minh Khoa", slug: "minh-khoa", gender: "male", age: 22, price: 140000, style: "Vui tính, thân thiện", langs: ["Tiếng Việt", "English"], acts: ["cafe", "study", "online-chat"], district: "Thủ Đức", sticker: "Học cùng nha!", bio: "Thích board game, cà phê và những buổi học nhóm vui vẻ.", photos: 2, now: true, height: 172 },
  { name: "Gia Bảo", slug: "gia-bao", gender: "male", age: 23, price: 160000, style: "Trầm tính, tử tế", langs: ["Tiếng Việt"], acts: ["gym", "temple", "cafe"], district: "Bình Thạnh", sticker: "Chạy bộ sáng mai?", bio: "Hay đi bộ buổi sáng, thích những quán cà phê yên tĩnh. Đáng tin cậy.", photos: 2, height: 174 },
  { name: "Hải Đăng", slug: "hai-dang", gender: "male", age: 26, price: 220000, style: "Mạnh mẽ, ga lăng", langs: ["Tiếng Việt", "English"], acts: ["gym", "party"], district: "Quận 7", sticker: "Tập gym cùng nhau!", bio: "Huấn luyện viên thể hình. Cùng tập luyện hoặc dự tiệc đều nhiệt tình.", photos: 1, height: 181 },
  { name: "Anh Tuấn", slug: "anh-tuan", gender: "male", age: 21, price: 110000, style: "Phóng khoáng, hài hước", langs: ["Tiếng Việt", "English"], acts: ["cafe", "party", "online-chat"], district: "Quận 3", sticker: "Đi cà phê nha?", bio: "Thích nhạc indie, chụp ảnh film và kể chuyện cười. Hợp đi chơi nhẹ nhàng.", photos: 2, now: true, height: 170 },
  { name: "Thành Long", slug: "thanh-long", gender: "male", age: 27, price: 270000, style: "Điềm đạm, sâu sắc", langs: ["Tiếng Việt", "English", "中文"], acts: ["family", "party", "temple"], district: "Quận 5", sticker: "Ra mắt gia đình?", bio: "Nói chuyện chừng mực, lễ phép với người lớn. Phù hợp các dịp gia đình.", photos: 2, height: 176 },
];

// Demo review pool (fictional). Each demo talent gets 2-4 of these via completed demo bookings.
const reviewPool: { rating: number; comment: string; reply?: string }[] = [
  { rating: 5, comment: "Rất đúng giờ và dễ nói chuyện, buổi cà phê trôi qua nhanh lắm. Sẽ book lại!", reply: "Cảm ơn bạn nhiều nha, hẹn gặp lại!" },
  { rating: 5, comment: "Lịch sự, chu đáo, mình thấy rất thoải mái. Recommend." },
  { rating: 4, comment: "Buổi hẹn vui, bạn chủ động chọn quán hợp lý. Chỉ trễ khoảng 5 phút." , reply: "Xin lỗi bạn vì đến trễ, lần sau mình sẽ chủ động hơn." },
  { rating: 5, comment: "Great company, easy to talk to. Made the event so much more fun." },
  { rating: 4, comment: "Thân thiện, hợp vibe. Mong lần sau có thêm thời gian." },
  { rating: 5, comment: "Cùng học bài rất tập trung, còn giải thích giúp mình mấy phần khó nữa." },
  { rating: 3, comment: "Buổi hẹn ổn, nhưng mình hơi mong đợi nhiều hơn một chút ở phần trò chuyện." },
  { rating: 5, comment: "Rất tinh tế và biết lắng nghe. Cảm ơn bạn vì một buổi tối dễ chịu." },
];

async function seedReviews(talentUserIds: string[]) {
  const pw = await argon2.hash("demo12345");
  const customers = [];
  for (let c = 1; c <= 4; c++) {
    const email = `customer${c}@cungdi.local`;
    customers.push(await prisma.user.upsert({
      where: { email }, create: { email, name: ["Lan Phương", "Quang Vinh", "Thu Trang", "Đình Nam"][c - 1], passwordHash: pw }, update: {},
    }));
  }
  for (const [i, talentId] of talentUserIds.entries()) {
    const n = 2 + (i % 3);
    for (let k = 0; k < n; k++) {
      const r = reviewPool[(i * 3 + k) % reviewPool.length];
      const bookingId = `demo-booking-${i}-${k}`;
      const customer = customers[(i + k) % customers.length];
      const date = new Date(Date.now() - (k * 9 + i + 3) * 24 * 3600 * 1000);
      await prisma.booking.upsert({
        where: { id: bookingId },
        create: { id: bookingId, customerId: customer.id, talentId, activity: "cafe", date, startTime: "19:00", hours: 2, place: "Quán cà phê trung tâm", status: "COMPLETED" },
        update: {},
      });
      const data = { rating: r.rating, comment: r.comment, reply: r.reply ?? null, repliedAt: r.reply ? date : null, createdAt: date };
      await prisma.review.upsert({
        where: { bookingId },
        create: { bookingId, talentId, customerId: customer.id, ...data }, update: data,
      });
    }
    const rows = await prisma.review.findMany({ where: { talentId, hidden: false }, select: { rating: true } });
    const avg = rows.length ? Math.round((rows.reduce((a, b) => a + b.rating, 0) / rows.length) * 100) / 100 : 0;
    await prisma.talentProfile.update({ where: { userId: talentId }, data: { ratingAvg: avg, ratingCount: rows.length } });
  }
}

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
  const talentIds: string[] = [];
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
    talentIds.push(user.id);
  }
  await seedReviews(talentIds);
}

main().finally(() => prisma.$disconnect());
