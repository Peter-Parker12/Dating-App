// Wording of every email and SMS the app sends. Kept free of I/O so it can be unit tested.
export type Locale = "vi" | "en";

export type NotificationType =
  | "KYC_SUBMITTED" | "KYC_APPROVED" | "KYC_REJECTED" | "KYC_NEW_SUBMISSION"
  | "ACCOUNT_SUSPENDED" | "ACCOUNT_REACTIVATED" | "ROLE_MODERATOR" | "ROLE_MEMBER"
  | "BOOKING_REQUESTED" | "BOOKING_ACCEPTED" | "BOOKING_DECLINED" | "BOOKING_CANCELLED" | "BOOKING_COMPLETED"
  | "REVIEW_RECEIVED" | "REVIEW_REPLIED" | "PHOTO_REMOVED";

export interface Mail { subject: string; text: string }

const BRAND = "Cùng Đi";
// Accents would force the more expensive Unicode SMS encoding, so SMS uses an unaccented name.
const SMS_BRAND = "Cung Di";

/** Names come from user input: collapse whitespace so they cannot break the message layout. */
const clean = (name: string) => name.replace(/\s+/g, " ").trim().slice(0, 80);

const GREETING: Record<Locale, (name: string) => string> = {
  vi: (n) => (n ? `Kính gửi ${n},` : "Kính gửi Quý khách,"),
  en: (n) => (n ? `Dear ${n},` : "Dear Sir or Madam,"),
};
const CLOSING: Record<Locale, string> = {
  vi: `Trân trọng,\nĐội ngũ ${BRAND}`,
  en: `Kind regards,\nThe ${BRAND} Team`,
};
const FOOTER: Record<Locale, string> = {
  vi: "Đây là email tự động, vui lòng không trả lời trực tiếp email này.",
  en: "This is an automated message; please do not reply to this email.",
};

function compose(locale: Locale, name: string, subject: string, paragraphs: string[]): Mail {
  const text = [GREETING[locale](clean(name)), ...paragraphs, CLOSING[locale], `--\n${FOOTER[locale]}`].join("\n\n");
  return { subject: `[${BRAND}] ${subject}`, text };
}

export function otpEmail(locale: Locale, name: string, code: string): Mail {
  return locale === "vi"
    ? compose(locale, name, "Mã xác minh tài khoản", [
        `Chúng tôi đã nhận được yêu cầu xác minh địa chỉ email cho tài khoản ${BRAND} của Quý khách.`,
        `Mã xác minh của Quý khách là: ${code}`,
        "Mã có hiệu lực trong 10 phút. Vì lý do bảo mật, Quý khách vui lòng không chia sẻ mã này với bất kỳ ai, kể cả nhân viên của chúng tôi. Nếu Quý khách không thực hiện yêu cầu này, xin vui lòng bỏ qua email này.",
      ])
    : compose(locale, name, "Account verification code", [
        `We received a request to verify the email address on your ${BRAND} account.`,
        `Your verification code is: ${code}`,
        "This code is valid for 10 minutes. For your security, please do not share it with anyone, including our staff. If you did not make this request, please disregard this email.",
      ]);
}

/** SMS stays short: no greeting or footer. */
export function otpSms(locale: Locale, code: string): string {
  return locale === "vi"
    ? `${SMS_BRAND}: Ma xac minh cua Quy khach la ${code}. Co hieu luc trong 10 phut. Khong chia se ma nay voi bat ky ai.`
    : `${SMS_BRAND}: Your verification code is ${code}. Valid for 10 minutes. Do not share it with anyone.`;
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2030-03-10" -> "10/03/2030" (vi) or "10 March 2030" (en). Dates are plain calendar days, so no time zone is involved. */
export function formatDay(iso: string, locale: Locale): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return locale === "vi" ? `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

/** The booking summary shown in every booking email. */
function bookingDetails(locale: Locale, d: Record<string, string>): string {
  const activity = (locale === "vi" ? d.activityVi : d.activityEn) || d.activityVi || d.activityEn || "";
  const when = `${d.time ?? ""}, ${formatDay(d.date ?? "", locale)}${d.hours ? ` (${d.hours} ${locale === "vi" ? "giờ" : d.hours === "1" ? "hour" : "hours"})` : ""}`;
  return locale === "vi"
    ? `Chi tiết lịch hẹn:\n- Hoạt động: ${activity}\n- Thời gian: ${when}\n- Địa điểm: ${d.place ?? ""}`
    : `Booking details:\n- Activity: ${activity}\n- Time: ${when}\n- Place: ${d.place ?? ""}`;
}

export function notificationEmail(locale: Locale, type: NotificationType, name: string, data: Record<string, string> = {}): Mail {
  const vi = locale === "vi";
  const subjectAndBody: Record<NotificationType, { subject: string; body: string[] }> = {
    KYC_SUBMITTED: vi
      ? { subject: "Đã tiếp nhận hồ sơ xác minh", body: [
          "Chúng tôi xin xác nhận đã tiếp nhận hồ sơ xác minh tài khoản của Quý khách.",
          "Đội ngũ quản trị sẽ kiểm tra thông tin và phản hồi trong thời gian sớm nhất. Quý khách sẽ nhận được thông báo ngay khi có kết quả.",
        ] }
      : { subject: "Verification documents received", body: [
          "We confirm that we have received your account verification documents.",
          "Our team will review the information and respond as soon as possible. You will be notified as soon as a decision has been made.",
        ] },
    KYC_APPROVED: vi
      ? { subject: "Tài khoản đã được xác minh", body: [
          `Chúng tôi vui mừng thông báo tài khoản ${BRAND} của Quý khách đã được xác minh thành công.`,
          "Kể từ bây giờ, Quý khách có thể sử dụng đầy đủ các tính năng của nền tảng, bao gồm đặt lịch, nhắn tin và đánh giá.",
        ] }
      : { subject: "Your account has been verified", body: [
          `We are pleased to inform you that your ${BRAND} account has been successfully verified.`,
          "You may now use all features of the platform, including booking, messaging and reviews.",
        ] },
    KYC_REJECTED: vi
      ? { subject: "Hồ sơ xác minh chưa được chấp thuận", body: [
          "Rất tiếc, hồ sơ xác minh của Quý khách chưa được chấp thuận.",
          `Lý do: ${data.reason ?? "Không có"}`,
          "Quý khách vui lòng cập nhật các giấy tờ cần chỉnh sửa và gửi lại hồ sơ tại mục Xác minh tài khoản. Những ảnh không thay đổi sẽ được giữ nguyên.",
        ] }
      : { subject: "Verification not approved", body: [
          "We regret to inform you that your verification documents could not be approved.",
          `Reason: ${data.reason ?? "None given"}`,
          "Please update the documents that need correcting and resubmit them from the Account verification page. Any photos you do not change will be kept.",
        ] },
    KYC_NEW_SUBMISSION: vi
      ? { subject: "Hồ sơ xác minh mới cần xem xét", body: [`Hệ thống vừa ghi nhận hồ sơ xác minh mới từ ${clean(data.name ?? "một người dùng")}. Vui lòng xem xét hồ sơ này trong mục Duyệt hồ sơ.`] }
      : { subject: "New verification awaiting review", body: [`A new verification submission has been received from ${clean(data.name ?? "a user")}. Please review it in the Review section.`] },
    ACCOUNT_SUSPENDED: vi
      ? { subject: "Tài khoản tạm thời bị khóa", body: [
          "Chúng tôi xin thông báo tài khoản của Quý khách đã bị tạm khóa.",
          "Nếu Quý khách cho rằng đây là sự nhầm lẫn, xin vui lòng liên hệ với chúng tôi để được xem xét lại.",
        ] }
      : { subject: "Account suspended", body: [
          "We wish to inform you that your account has been suspended.",
          "If you believe this was done in error, please contact us so that we can review the matter.",
        ] },
    ACCOUNT_REACTIVATED: vi
      ? { subject: "Tài khoản đã được mở khóa", body: ["Chúng tôi xin thông báo tài khoản của Quý khách đã được mở khóa. Quý khách có thể đăng nhập và tiếp tục sử dụng dịch vụ bình thường."] }
      : { subject: "Account reactivated", body: ["We wish to inform you that your account has been reactivated. You may log in and continue to use the service as normal."] },
    ROLE_MODERATOR: vi
      ? { subject: "Quyền điều hành viên được cấp", body: [
          "Quý khách đã được cấp quyền điều hành viên trên nền tảng.",
          "Quý khách có thể xem xét, chấp thuận hoặc từ chối hồ sơ xác minh của người dùng tại mục Duyệt hồ sơ. Xin vui lòng bảo mật thông tin cá nhân và giấy tờ mà Quý khách được xem.",
        ] }
      : { subject: "Moderator access granted", body: [
          "You have been granted moderator access on the platform.",
          "You may review, approve or reject users' verification submissions in the Review section. Please treat all personal information and documents you can see as strictly confidential.",
        ] },
    ROLE_MEMBER: vi
      ? { subject: "Quyền điều hành viên đã được gỡ", body: ["Chúng tôi xin thông báo quyền điều hành viên của Quý khách đã được gỡ. Tài khoản của Quý khách trở lại là tài khoản thành viên thông thường."] }
      : { subject: "Moderator access removed", body: ["We wish to inform you that your moderator access has been removed. Your account has returned to a regular member account."] },
    BOOKING_REQUESTED: vi
      ? { subject: "Có yêu cầu đặt lịch mới", body: [
          `Quý khách vừa nhận được một yêu cầu đặt lịch mới từ ${clean(data.name ?? "một khách hàng")}.`, bookingDetails(locale, data),
          "Xin vui lòng đăng nhập và vào mục Lịch hẹn để chấp nhận hoặc từ chối yêu cầu này trong thời gian sớm nhất.",
        ] }
      : { subject: "New booking request", body: [
          `You have received a new booking request from ${clean(data.name ?? "a customer")}.`, bookingDetails(locale, data),
          "Please log in and open the Bookings section to accept or decline this request as soon as possible.",
        ] },
    BOOKING_ACCEPTED: vi
      ? { subject: "Yêu cầu đặt lịch đã được chấp nhận", body: [
          `${clean(data.name ?? "Bạn đồng hành")} đã chấp nhận yêu cầu đặt lịch của Quý khách.`, bookingDetails(locale, data),
          "Quý khách có thể nhắn tin trực tiếp trong mục Lịch hẹn. Xin lưu ý chỉ gặp mặt tại địa điểm công cộng và tuân thủ Quy tắc ứng xử của nền tảng.",
        ] }
      : { subject: "Your booking request was accepted", body: [
          `${clean(data.name ?? "Your companion")} has accepted your booking request.`, bookingDetails(locale, data),
          "You can now message each other in the Bookings section. Please meet only in a public place and follow the platform's code of conduct.",
        ] },
    BOOKING_DECLINED: vi
      ? { subject: "Yêu cầu đặt lịch không được chấp nhận", body: [
          `Rất tiếc, ${clean(data.name ?? "bạn đồng hành")} không thể nhận yêu cầu đặt lịch của Quý khách.`, bookingDetails(locale, data),
          "Quý khách có thể tham khảo và gửi yêu cầu đến một bạn đồng hành khác trong mục Khám phá.",
        ] }
      : { subject: "Your booking request was declined", body: [
          `We regret to inform you that ${clean(data.name ?? "the companion")} is unable to accept your booking request.`, bookingDetails(locale, data),
          "You are welcome to browse and send a request to another companion in the Explore section.",
        ] },
    BOOKING_CANCELLED: vi
      ? { subject: "Lịch hẹn đã được hủy", body: [`${clean(data.name ?? "Khách hàng")} đã hủy lịch hẹn dưới đây.`, bookingDetails(locale, data)] }
      : { subject: "A booking was cancelled", body: [`${clean(data.name ?? "The customer")} has cancelled the booking below.`, bookingDetails(locale, data)] },
    BOOKING_COMPLETED: vi
      ? { subject: "Lịch hẹn đã hoàn tất", body: [
          `Lịch hẹn với ${clean(data.name ?? "đối tác")} đã được ghi nhận là hoàn tất.`, bookingDetails(locale, data),
          ...(data.role === "customer" ? ["Quý khách vui lòng dành ít phút để đánh giá trải nghiệm trong mục Lịch hẹn. Ý kiến của Quý khách giúp cộng đồng ngày càng tốt hơn."] : []),
        ] }
      : { subject: "Booking completed", body: [
          `Your booking with ${clean(data.name ?? "your partner")} has been marked as completed.`, bookingDetails(locale, data),
          ...(data.role === "customer" ? ["We would appreciate it if you could take a moment to review your experience in the Bookings section. Your feedback helps the community."] : []),
        ] },
    REVIEW_RECEIVED: vi
      ? { subject: "Quý khách có đánh giá mới", body: [`${clean(data.name ?? "Một khách hàng")} vừa gửi đánh giá ${data.rating ?? ""} sao cho Quý khách. Quý khách có thể xem và phản hồi trong mục Talent.`] }
      : { subject: "You have a new review", body: [`${clean(data.name ?? "A customer")} has left you a ${data.rating ?? ""}-star review. You can read it and reply in the Talent section.`] },
    PHOTO_REMOVED: vi
      ? { subject: "Một ảnh của Quý khách đã bị gỡ", body: [
          "Một ảnh trong hồ sơ của Quý khách đã được đội ngũ quản trị gỡ khỏi nền tảng vì chưa phù hợp với Quy tắc ứng xử.",
          `Lý do: ${data.reason ?? "Không có"}`,
          "Quý khách có thể tải lên một ảnh khác phù hợp. Nếu cho rằng đây là sự nhầm lẫn, xin vui lòng liên hệ với chúng tôi để được xem xét lại.",
        ] }
      : { subject: "A photo was removed from your profile", body: [
          "A photo on your profile has been removed from the platform by our team because it did not comply with the code of conduct.",
          `Reason: ${data.reason ?? "None given"}`,
          "You are welcome to upload another suitable photo. If you believe this was a mistake, please contact us so that we can review the matter.",
        ] },
    REVIEW_REPLIED: vi
      ? { subject: "Có phản hồi cho đánh giá của Quý khách", body: [`${clean(data.name ?? "Bạn đồng hành")} đã phản hồi đánh giá của Quý khách.`] }
      : { subject: "A reply to your review", body: [`${clean(data.name ?? "The companion")} has replied to your review.`] },
  };
  const { subject, body } = subjectAndBody[type];
  return compose(locale, name, subject, body);
}

export function testEmail(locale: Locale, name: string): Mail {
  return locale === "vi"
    ? compose(locale, name, "Email kiểm tra cấu hình", [
        "Đây là email kiểm tra được gửi từ phần cấu hình email trong trang quản trị.",
        "Nếu Quý khách đọc được email này, việc gửi email của hệ thống đang hoạt động bình thường.",
      ])
    : compose(locale, name, "Email settings test", [
        "This is a test message sent from the email settings in the admin area.",
        "If you can read this message, email delivery from the system is working correctly.",
      ]);
}
