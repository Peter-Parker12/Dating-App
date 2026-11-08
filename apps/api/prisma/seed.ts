import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

// Demo accounts get a random password (not loggable) unless DEMO_PASSWORD is set, so a public
// deployment never exposes accounts with a known password.
const demoHash = () => argon2.hash(process.env.DEMO_PASSWORD ?? randomUUID());

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
  { name: "Lan Chi", slug: "lan-chi", gender: "female", age: 21, price: 140000, style: "Cá tính, năng động", langs: ["Tiếng Việt", "English"], acts: ["cafe", "study", "online-chat"], district: "Quận 4", sticker: "Cà phê sách nha!", bio: "Thích những quán cà phê có góc đọc sách và những cuộc trò chuyện không vội vã.", photos: 1, height: 180, now: false },
  { name: "Thủy Tiên", slug: "thuy-tien", gender: "female", age: 23, price: 210000, style: "Thời thượng, tự tin", langs: ["Tiếng Việt", "English"], acts: ["party", "cafe", "family"], district: "Quận 1", sticker: "Dự tiệc cùng mình!", bio: "Biết cách mặc đẹp, nói chuyện duyên và tạo không khí vui trong các buổi tiệc.", photos: 1, height: 169, now: true },
  { name: "Kim Ngân", slug: "kim-ngan", gender: "female", age: 22, price: 160000, style: "Tươi tắn, hoạt bát", langs: ["Tiếng Việt", "English"], acts: ["cafe", "temple", "party"], district: "Quận 8", sticker: "Đi chùa cầu an?", bio: "Luôn mang theo nụ cười. Thích đi chùa đầu tháng và thử món ăn vặt mới.", photos: 1, height: 162, now: false },
  { name: "Diễm My", slug: "diem-my", gender: "female", age: 24, price: 230000, style: "Duyên dáng, lịch thiệp", langs: ["Tiếng Việt", "English", "Français"], acts: ["family", "party", "cafe"], district: "Quận 3", sticker: "Ra mắt gia đình?", bio: "Lễ phép, ăn nói nhẹ nhàng, phù hợp các buổi gặp gỡ gia đình và đối tác.", photos: 1, height: 176, now: false },
  { name: "Tuệ Lâm", slug: "tue-lam", gender: "female", age: 25, price: 180000, style: "Điềm tĩnh, sâu sắc", langs: ["Tiếng Việt", "English", "हिन्दी"], acts: ["online-chat", "study", "temple"], district: "Quận Tân Bình", sticker: "Tâm sự tối nay?", bio: "Biết lắng nghe và không phán xét. Thích trò chuyện về sách, phim và cuộc sống.", photos: 1, height: 158, now: false },
  { name: "Nhật Hà", slug: "nhat-ha", gender: "female", age: 20, price: 110000, style: "Trẻ trung, hay cười", langs: ["Tiếng Việt"], acts: ["study", "cafe"], district: "Thủ Đức", sticker: "Học bài cùng nhau!", bio: "Sinh viên năm hai, thích học nhóm ở thư viện rồi rủ nhau đi uống trà sữa.", photos: 1, height: 173, now: false },
  { name: "Khánh Vy", slug: "khanh-vy", gender: "female", age: 22, price: 150000, style: "Nhẹ nhàng, nữ tính", langs: ["Tiếng Việt", "English"], acts: ["cafe", "temple", "family"], district: "Phú Nhuận", sticker: "Cà phê chill nha?", bio: "Thích không gian yên tĩnh, nhạc acoustic và những buổi hẹn không áp lực.", photos: 1, height: 162, now: false },
  { name: "Ngọc Hân", slug: "ngoc-han", gender: "female", age: 23, price: 170000, style: "Hiện đại, gần gũi", langs: ["Tiếng Việt", "English"], acts: ["gym", "cafe", "online-chat"], district: "Quận 7", sticker: "Đi tập cùng nhau!", bio: "Tập yoga mỗi sáng, thích rủ bạn bè cùng sống lành mạnh.", photos: 1, height: 169, now: false },
  { name: "Bích Trâm", slug: "bich-tram", gender: "female", age: 24, price: 200000, style: "Thanh lịch, chỉn chu", langs: ["Tiếng Việt", "English", "日本語"], acts: ["party", "family", "cafe"], district: "Quận 2", sticker: "Dự tiệc nhé!", bio: "Làm việc ở công ty nước ngoài, quen với các sự kiện và buổi gặp mặt trang trọng.", photos: 1, height: 176, now: true },
  { name: "Yến Nhi", slug: "yen-nhi", gender: "female", age: 21, price: 135000, style: "Ngọt ngào, dễ thương", langs: ["Tiếng Việt", "English"], acts: ["cafe", "study", "temple"], district: "Bình Tân", sticker: "Đi cà phê nha!", bio: "Thích bánh ngọt, mèo và những buổi chiều lang thang quanh thành phố.", photos: 1, height: 180, now: false },
  { name: "Hồng Nhung", slug: "hong-nhung", gender: "female", age: 25, price: 240000, style: "Tự tin, cuốn hút", langs: ["Tiếng Việt", "English"], acts: ["party", "online-chat", "family"], district: "Quận 10", sticker: "Tâm sự tối nay?", bio: "Nói chuyện duyên, kể chuyện hay, luôn tạo cảm giác thoải mái cho người đối diện.", photos: 1, height: 158, now: false },
  { name: "Thanh Vân", slug: "thanh-van", gender: "female", age: 22, price: 155000, style: "Hồn nhiên, vui vẻ", langs: ["Tiếng Việt", "English"], acts: ["cafe", "party", "gym"], district: "Quận 6", sticker: "Vui hết mình nha!", bio: "Thích âm nhạc, du lịch bụi và những buổi hẹn bất ngờ.", photos: 1, height: 162, now: true },
  { name: "Quang Minh", slug: "quang-minh", gender: "male", age: 26, price: 260000, style: "Chững chạc, lịch lãm", langs: ["Tiếng Việt", "English"], acts: ["party", "family", "cafe"], district: "Quận 1", sticker: "Dự tiệc cùng nhau!", bio: "Phong thái điềm đạm, quen với các sự kiện công ty và buổi gặp đối tác.", photos: 1, height: 178, now: false },
  { name: "Việt Hoàng", slug: "viet-hoang", gender: "male", age: 24, price: 170000, style: "Trầm tính, tinh tế", langs: ["Tiếng Việt", "English", "中文"], acts: ["cafe", "study", "online-chat"], district: "Quận 5", sticker: "Cà phê yên tĩnh nhé?", bio: "Thích những quán cà phê vắng, sách triết học và những cuộc trò chuyện sâu.", photos: 1, height: 168, now: false },
  { name: "Nhật Minh", slug: "nhat-minh", gender: "male", age: 22, price: 130000, style: "Vui tính, hoạt bát", langs: ["Tiếng Việt", "English"], acts: ["cafe", "party", "gym"], district: "Thủ Đức", sticker: "Đi chơi không?", bio: "Biết pha trò, thích board game và luôn là người làm không khí sôi nổi.", photos: 1, height: 173, now: true },
  { name: "Hoàng Long", slug: "hoang-long", gender: "male", age: 27, price: 230000, style: "Lịch sự, đáng tin cậy", langs: ["Tiếng Việt", "English"], acts: ["family", "party", "temple"], district: "Quận 3", sticker: "Ra mắt gia đình?", bio: "Ăn nói chừng mực, lễ phép với người lớn, rất hợp các dịp gia đình.", photos: 1, height: 168, now: false },
  { name: "Duy Khang", slug: "duy-khang", gender: "male", age: 23, price: 150000, style: "Phóng khoáng, thích phượt", langs: ["Tiếng Việt", "English"], acts: ["gym", "cafe", "online-chat"], district: "Quận 12", sticker: "Chạy bộ sáng mai?", bio: "Mê phượt, chạy bộ và chụp ảnh. Rủ đi đâu cũng sẵn sàng.", photos: 1, height: 178, now: true },
  { name: "Tấn Phát", slug: "tan-phat", gender: "male", age: 25, price: 190000, style: "Ấm áp, chân thành", langs: ["Tiếng Việt", "English"], acts: ["cafe", "temple", "family"], district: "Gò Vấp", sticker: "Đi chùa cùng nhau?", bio: "Sống chậm, thích nấu ăn và đi chùa đầu tháng. Dễ gần, dễ nói chuyện.", photos: 1, height: 173, now: false },
  { name: "Hoài Nam", slug: "hoai-nam", gender: "male", age: 28, price: 280000, style: "Cuốn hút, bí ẩn", langs: ["Tiếng Việt", "English"], acts: ["party", "online-chat", "cafe"], district: "Quận 2", sticker: "Tối nay đi chơi?", bio: "Yêu nhạc jazz và phim độc lập. Kể chuyện duyên và biết lắng nghe.", photos: 1, height: 173, now: false },
  { name: "Gia Huy", slug: "gia-huy", gender: "male", age: 24, price: 175000, style: "Điềm đạm, sâu sắc", langs: ["Tiếng Việt", "English"], acts: ["study", "cafe", "online-chat"], district: "Bình Thạnh", sticker: "Học cùng nha!", bio: "Học công nghệ, thích giải thích bài khó và những cuộc tranh luận vui.", photos: 1, height: 168, now: false },
  { name: "Trung Kiên", slug: "trung-kien", gender: "male", age: 26, price: 210000, style: "Mạnh mẽ, nam tính", langs: ["Tiếng Việt", "English"], acts: ["gym", "party", "cafe"], district: "Quận 7", sticker: "Tập gym cùng nhau!", bio: "Tập luyện đều đặn, thích thể thao và những buổi hẹn năng lượng.", photos: 1, height: 178, now: false },
  { name: "Bảo Long", slug: "bao-long", gender: "male", age: 27, price: 240000, style: "Phong trần, tử tế", langs: ["Tiếng Việt", "English"], acts: ["cafe", "party", "temple"], district: "Quận 4", sticker: "Cà phê nha?", bio: "Thích âm nhạc acoustic, nấu ăn và những buổi tối nhẹ nhàng cùng bạn bè.", photos: 1, height: 168, now: false },
  { name: "Minh Trí", slug: "minh-tri", gender: "male", age: 25, price: 160000, style: "Trầm lắng, chu đáo", langs: ["Tiếng Việt"], acts: ["study", "temple", "online-chat"], district: "Phú Nhuận", sticker: "Tâm sự nhé?", bio: "Ít nói nhưng biết lắng nghe. Thích thư viện, trà nóng và những cuộc trò chuyện nhỏ.", photos: 1, height: 173, now: false },
  { name: "Khôi Nguyên", slug: "khoi-nguyen", gender: "male", age: 29, price: 270000, style: "Nghệ sĩ, sâu lắng", langs: ["Tiếng Việt", "English", "Français"], acts: ["party", "family", "online-chat"], district: "Quận 3", sticker: "Nghe nhạc cùng nhau?", bio: "Chơi violin, yêu nhạc cổ điển và những buổi hòa nhạc nhỏ.", photos: 1, height: 178, now: false },
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

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const slot = (ds: string[], bs: string[]) => ds.flatMap((d) => bs.map((b) => `${d}:${b}`));
const allBlocks = ["morning", "afternoon", "evening"];
// A few realistic weekly patterns, handed out round-robin to the demo talents.
const schedulePatterns: string[][] = [
  [...slot(days.slice(0, 5), ["evening"]), ...slot(["sat", "sun"], allBlocks)],
  slot(["sat", "sun"], allBlocks),
  slot(days.slice(0, 5), ["afternoon", "evening"]),
  [...slot(["mon", "wed", "fri"], ["evening"]), ...slot(["sat"], ["afternoon", "evening"])],
  [...slot(["tue", "thu"], ["morning"]), ...slot(["sun"], allBlocks)],
];

// Demo customers and what they are looking for (shown to approved talents).
const demoCustomers = [
  { name: "Lan Phương", acts: ["cafe", "study"], note: "Mình cần người cùng học và ôn thi cuối kỳ." },
  { name: "Quang Vinh", acts: ["party", "family"], note: "Tìm bạn đồng hành đi tiệc công ty cuối tháng." },
  { name: "Thu Trang", acts: ["cafe", "online-chat"], note: "Muốn có người trò chuyện, đi cà phê cuối tuần." },
  { name: "Đình Nam", acts: ["gym"], note: "Cần bạn tập gym buổi sáng." },
  { name: "Mai Anh", acts: ["temple", "cafe"], note: "Đi chùa đầu tháng, sau đó cà phê nhẹ nhàng." },
  { name: "Hoàng Yến", acts: ["family"], note: "Ra mắt gia đình vào dịp Tết, cần người lịch sự." },
  { name: "Bảo Châu", acts: ["study", "online-chat"], note: "Ôn IELTS và muốn tâm sự những lúc áp lực." },
  { name: "Tuấn Anh", acts: ["party", "cafe", "gym"], note: "Thích hoạt động nhóm, đi chơi cuối tuần." },
];

async function seedCustomers(): Promise<{ id: string }[]> {
  const pw = await demoHash();
  const out = [];
  for (const [i, c] of demoCustomers.entries()) {
    const email = `customer${i + 1}@cungdi.local`;
    const profile = { lookingFor: c.acts, lookingForNote: c.note, province: "Thành phố Hồ Chí Minh" };
    out.push(await prisma.user.upsert({
      where: { email },
      create: { email, name: c.name, passwordHash: pw, kycStatus: "APPROVED", emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), ...profile },
      // Demo customers are always approved so the talent-side list is populated, even on older databases.
      update: { kycStatus: "APPROVED", ...profile },
    }));
  }
  return out;
}

async function seedReviews(talentUserIds: string[]) {
  const customers = (await seedCustomers()).slice(0, 4);
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
    create: { email: admin, name: "Admin", role: "ADMIN", passwordHash: await argon2.hash(adminPw), kycStatus: "APPROVED" },
    update: {},
  });

  if (process.env.SEED_DEMO === "false") {
    console.log("[seed] SEED_DEMO=false: demo profiles skipped");
    return;
  }
  const pw = await demoHash();
  const talentIds: string[] = [];
  for (const [i, t] of talents.entries()) {
    const email = `talent${i + 1}@cungdi.local`;
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: t.name, role: "TALENT", passwordHash: pw, kycStatus: "APPROVED", emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() },
      update: {},
    });
    const data = {
      displayName: t.name, gender: t.gender, age: t.age, hourlyPrice: t.price, style: t.style,
      languages: t.langs, activities: t.acts, heightCm: t.height, bio: t.bio, district: t.district,
      sticker: t.sticker, availableNow: t.now ?? false, availability: "",
      schedule: schedulePatterns[i % schedulePatterns.length],
      photos: Array.from({ length: t.photos }, (_, n) => `/photos/${t.slug}-${n + 1}.jpg`),
    };
    await prisma.talentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    talentIds.push(user.id);
  }
  await seedReviews(talentIds);
  console.log(`[seed] demo data ready: ${talentIds.length} talents`);
}

main().finally(() => prisma.$disconnect());
