/** Normalizes a Vietnamese mobile number to the national form 0xxxxxxxxx, or null if invalid. */
export function normalizeVnPhone(input: string): string | null {
  const digits = input.trim().replace(/[\s.\-()]/g, "");
  const national = digits.replace(/^\+?84/, "0");
  return /^0(3|5|7|8|9)\d{8}$/.test(national) ? national : null;
}
