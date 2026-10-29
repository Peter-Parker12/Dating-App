"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "vi" | "en";

const dict = {
  vi: {
    "brand": "Cùng Đi",
    "nav.home": "Trang chủ", "nav.explore": "Khám phá", "nav.bookings": "Lịch hẹn", "nav.saved": "Đã lưu",
    "nav.safety": "An toàn", "nav.profile": "Hồ sơ", "nav.login": "Đăng nhập", "nav.register": "Đăng ký",
    "nav.logout": "Đăng xuất", "nav.admin": "Quản trị", "nav.talent": "Talent",
    "home.title": "Hẹn đúng vibe, đi cùng nhau!", "home.sub": "Tìm bạn đồng hành cho cà phê, học nhóm, sự kiện và nhiều hơn nữa. Đã xác minh, an toàn, riêng tư.",
    "home.cta": "Khám phá ngay", "home.step1": "Chọn bạn đồng hành", "home.step1d": "Lọc theo giới tính, giá và hoạt động bạn thích.",
    "home.step2": "Gửi yêu cầu", "home.step2d": "Chọn hoạt động, thời gian, địa điểm công cộng và cam kết quy tắc ứng xử.",
    "home.step3": "Nhắn tin & đi cùng nhau", "home.step3d": "Khi được chấp nhận, khung chat sẽ mở ra.",
    "home.why": "Vì sao chọn chúng tôi",
    "home.r1": "Xác minh danh tính", "home.r1d": "Hồ sơ được quản trị viên duyệt thủ công.",
    "home.r2": "Chat được bảo vệ", "home.r2d": "Tự động che số điện thoại, liên kết và từ khoá ngoài nền tảng.",
    "home.r3": "Nút SOS", "home.r3d": "Một chạm để gửi cảnh báo kèm vị trí.",
    "home.r4": "Địa điểm công cộng", "home.r4d": "Mọi buổi hẹn diễn ra ở nơi đông người.",
    "explore.title": "Khám phá bạn đồng hành", "explore.gender": "Giới tính", "explore.all": "Tất cả",
    "explore.female": "Nữ", "explore.male": "Nam", "explore.other": "Khác", "explore.activity": "Hoạt động",
    "explore.maxPrice": "Giá tối đa / giờ", "explore.search": "Tìm theo tên", "explore.empty": "Chưa có hồ sơ phù hợp.",
    "talent.perHour": "/ giờ", "talent.save": "Lưu", "talent.saved": "Đã lưu", "talent.book": "Đặt ngay",
    "talent.verified": "Đã xác minh", "talent.age": "Tuổi", "talent.height": "Chiều cao", "talent.style": "Phong cách",
    "talent.languages": "Ngôn ngữ", "talent.availability": "Lịch rảnh", "talent.activities": "Hoạt động",
    "book.title": "Đặt lịch hẹn", "book.info": "Thông tin", "book.conduct": "Cam kết", "book.send": "Gửi yêu cầu",
    "book.activity": "Hoạt động", "book.date": "Ngày", "book.time": "Giờ bắt đầu", "book.hours": "Số giờ",
    "book.place": "Địa điểm công cộng", "book.note": "Ghi chú", "book.next": "Tiếp tục", "book.back": "Quay lại",
    "book.conductTitle": "Bộ quy tắc ứng xử",
    "book.c1": "Chỉ gặp ở nơi công cộng, đông người.", "book.c2": "Tôn trọng ranh giới của nhau; không quấy rối, không ép buộc.",
    "book.c3": "Không trao đổi liên lạc hay giao dịch ngoài nền tảng.", "book.c4": "Dùng nút SOS khi cảm thấy không an toàn.",
    "book.agree": "Tôi đồng ý và ký điện tử bộ quy tắc trên.", "book.done": "Đã gửi yêu cầu! Hãy chờ Talent chấp nhận.",
    "bookings.title": "Lịch hẹn của tôi", "bookings.empty": "Chưa có lịch hẹn.", "bookings.accept": "Chấp nhận",
    "bookings.decline": "Từ chối", "bookings.cancel": "Huỷ", "bookings.complete": "Hoàn tất", "bookings.chat": "Nhắn tin",
    "status.PENDING": "Chờ xác nhận", "status.ACCEPTED": "Đã chấp nhận", "status.DECLINED": "Đã từ chối",
    "status.CANCELLED": "Đã huỷ", "status.COMPLETED": "Hoàn tất",
    "chat.title": "Tin nhắn", "chat.placeholder": "Nhập tin nhắn...", "chat.send": "Gửi",
    "chat.masked": "Thông tin liên lạc/giao dịch ngoài nền tảng sẽ tự động bị che.", "chat.locked": "Chat mở sau khi Talent chấp nhận.",
    "saved.title": "Đã lưu", "saved.empty": "Bạn chưa lưu ai.",
    "safety.title": "An toàn là trên hết",
    "safety.s1": "Xác minh danh tính (CCCD + ảnh chân dung) do quản trị viên duyệt.",
    "safety.s2": "Chat tự động che số điện thoại, liên kết và từ khoá giao dịch ngoài nền tảng.",
    "safety.s3": "Nút SOS gửi cảnh báo kèm vị trí tới đội ngũ quản trị.",
    "safety.s4": "Mọi buổi hẹn tại địa điểm công cộng và có ký cam kết quy tắc ứng xử.",
    "profile.title": "Hồ sơ", "profile.verify": "Xác minh danh tính", "profile.idImage": "Ảnh CCCD", "profile.selfie": "Ảnh chân dung",
    "profile.submit": "Gửi xác minh", "profile.status": "Trạng thái",
    "idStatus.NONE": "Chưa xác minh", "idStatus.PENDING": "Đang chờ duyệt", "idStatus.APPROVED": "Đã xác minh", "idStatus.REJECTED": "Bị từ chối",
    "talentdash.title": "Hồ sơ Talent", "talentdash.name": "Tên hiển thị", "talentdash.bio": "Giới thiệu", "talentdash.save": "Lưu hồ sơ",
    "talentdash.price": "Giá / giờ (VNĐ)", "talentdash.langs": "Ngôn ngữ (cách nhau bằng dấu phẩy)", "talentdash.published": "Hiển thị công khai",
    "talentdash.height": "Chiều cao (cm)", "talentdash.saved": "Đã lưu!",
    "admin.title": "Quản trị", "admin.verifications": "Duyệt danh tính", "admin.sos": "Cảnh báo SOS", "admin.users": "Người dùng",
    "admin.approve": "Duyệt", "admin.reject": "Từ chối", "admin.resolve": "Đã xử lý", "admin.suspend": "Khoá", "admin.activate": "Mở khoá",
    "admin.none": "Không có mục nào.",
    "sos.button": "SOS", "sos.confirm": "Gửi cảnh báo SOS kèm vị trí của bạn?", "sos.sent": "Đã gửi cảnh báo SOS.",
    "auth.email": "Email", "auth.password": "Mật khẩu (tối thiểu 8 ký tự)", "auth.name": "Họ tên", "auth.role": "Bạn là",
    "auth.customer": "Khách hàng", "auth.talent": "Talent (bạn đồng hành)", "auth.submitLogin": "Đăng nhập", "auth.submitRegister": "Tạo tài khoản",
    "auth.error": "Có lỗi xảy ra, vui lòng thử lại.", "auth.badCreds": "Email hoặc mật khẩu không đúng.", "auth.taken": "Email đã được sử dụng.",
    "common.loading": "Đang tải...", "common.hours": "giờ",
  },
  en: {
    "brand": "Cùng Đi",
    "nav.home": "Home", "nav.explore": "Explore", "nav.bookings": "Bookings", "nav.saved": "Saved",
    "nav.safety": "Safety", "nav.profile": "Profile", "nav.login": "Log in", "nav.register": "Sign up",
    "nav.logout": "Log out", "nav.admin": "Admin", "nav.talent": "Talent",
    "home.title": "Find the right vibe, go together!", "home.sub": "Find a companion for coffee, study sessions, events and more. Verified, safe, private.",
    "home.cta": "Explore now", "home.step1": "Pick a companion", "home.step1d": "Filter by gender, price and the activity you like.",
    "home.step2": "Send a request", "home.step2d": "Choose an activity, time and public place, and agree to the code of conduct.",
    "home.step3": "Chat & go together", "home.step3d": "Once accepted, chat unlocks.",
    "home.why": "Why choose us",
    "home.r1": "Identity checks", "home.r1d": "Profiles are reviewed manually by admins.",
    "home.r2": "Protected chat", "home.r2d": "Phone numbers, links and off-platform keywords are masked automatically.",
    "home.r3": "SOS button", "home.r3d": "One tap sends an alert with your location.",
    "home.r4": "Public places", "home.r4d": "Every meetup happens somewhere public.",
    "explore.title": "Explore companions", "explore.gender": "Gender", "explore.all": "All",
    "explore.female": "Female", "explore.male": "Male", "explore.other": "Other", "explore.activity": "Activity",
    "explore.maxPrice": "Max price / hour", "explore.search": "Search by name", "explore.empty": "No matching profiles yet.",
    "talent.perHour": "/ hour", "talent.save": "Save", "talent.saved": "Saved", "talent.book": "Book now",
    "talent.verified": "Verified", "talent.age": "Age", "talent.height": "Height", "talent.style": "Style",
    "talent.languages": "Languages", "talent.availability": "Availability", "talent.activities": "Activities",
    "book.title": "Book a meetup", "book.info": "Details", "book.conduct": "Agreement", "book.send": "Send request",
    "book.activity": "Activity", "book.date": "Date", "book.time": "Start time", "book.hours": "Hours",
    "book.place": "Public place", "book.note": "Note", "book.next": "Continue", "book.back": "Back",
    "book.conductTitle": "Code of conduct",
    "book.c1": "Meet only in public, busy places.", "book.c2": "Respect each other's boundaries; no harassment or pressure.",
    "book.c3": "No off-platform contact or transactions.", "book.c4": "Use the SOS button if you feel unsafe.",
    "book.agree": "I agree and e-sign the code above.", "book.done": "Request sent! Wait for the Talent to accept.",
    "bookings.title": "My bookings", "bookings.empty": "No bookings yet.", "bookings.accept": "Accept",
    "bookings.decline": "Decline", "bookings.cancel": "Cancel", "bookings.complete": "Complete", "bookings.chat": "Chat",
    "status.PENDING": "Pending", "status.ACCEPTED": "Accepted", "status.DECLINED": "Declined",
    "status.CANCELLED": "Cancelled", "status.COMPLETED": "Completed",
    "chat.title": "Messages", "chat.placeholder": "Type a message...", "chat.send": "Send",
    "chat.masked": "Contact details and off-platform payment talk are masked automatically.", "chat.locked": "Chat opens once the Talent accepts.",
    "saved.title": "Saved", "saved.empty": "You haven't saved anyone yet.",
    "safety.title": "Safety comes first",
    "safety.s1": "ID verification (ID card + selfie) reviewed by admins.",
    "safety.s2": "Chat masks phone numbers, links and off-platform payment keywords.",
    "safety.s3": "The SOS button sends an alert with your location to our admins.",
    "safety.s4": "Every meetup is in a public place with a signed code of conduct.",
    "profile.title": "Profile", "profile.verify": "Identity verification", "profile.idImage": "ID card photo", "profile.selfie": "Selfie",
    "profile.submit": "Submit for review", "profile.status": "Status",
    "idStatus.NONE": "Not verified", "idStatus.PENDING": "Pending review", "idStatus.APPROVED": "Verified", "idStatus.REJECTED": "Rejected",
    "talentdash.title": "Talent profile", "talentdash.name": "Display name", "talentdash.bio": "About you", "talentdash.save": "Save profile",
    "talentdash.price": "Price / hour (VND)", "talentdash.langs": "Languages (comma separated)", "talentdash.published": "Visible to everyone",
    "talentdash.height": "Height (cm)", "talentdash.saved": "Saved!",
    "admin.title": "Admin", "admin.verifications": "ID reviews", "admin.sos": "SOS alerts", "admin.users": "Users",
    "admin.approve": "Approve", "admin.reject": "Reject", "admin.resolve": "Resolve", "admin.suspend": "Suspend", "admin.activate": "Reactivate",
    "admin.none": "Nothing here.",
    "sos.button": "SOS", "sos.confirm": "Send an SOS alert with your location?", "sos.sent": "SOS alert sent.",
    "auth.email": "Email", "auth.password": "Password (min 8 characters)", "auth.name": "Full name", "auth.role": "I am a",
    "auth.customer": "Customer", "auth.talent": "Talent (companion)", "auth.submitLogin": "Log in", "auth.submitRegister": "Create account",
    "auth.error": "Something went wrong, please try again.", "auth.badCreds": "Wrong email or password.", "auth.taken": "Email already in use.",
    "common.loading": "Loading...", "common.hours": "h",
  },
} as const;

export type Key = keyof typeof dict.vi;

interface Ctx { locale: Locale; setLocale: (l: Locale) => void; t: (k: Key) => string }
const I18n = createContext<Ctx>({ locale: "vi", setLocale: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLoc] = useState<Locale>("vi");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("locale");
      if (saved === "vi" || saved === "en") setLoc(saved);
    } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const setLocale = useCallback((l: Locale) => {
    setLoc(l);
    try { localStorage.setItem("locale", l); } catch {}
  }, []);
  const t = useCallback((k: Key) => dict[locale][k] ?? k, [locale]);
  return <I18n.Provider value={{ locale, setLocale, t }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
