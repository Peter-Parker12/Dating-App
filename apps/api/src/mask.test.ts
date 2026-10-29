import { describe, expect, it } from "vitest";
import { maskContacts } from "./mask.js";

describe("maskContacts", () => {
  it("masks VN phone numbers", () => {
    expect(maskContacts("call 0912 345 678 now").text).toBe("call *** now");
    expect(maskContacts("+84 912-345-678").flagged).toBe(true);
  });
  it("masks urls and emails", () => {
    expect(maskContacts("see https://fb.com/x").text).toBe("see ***");
    expect(maskContacts("mail a.b@x.com").text).toBe("mail ***");
  });
  it("masks off-platform keywords", () => {
    expect(maskContacts("add zalo nhé").text).toBe("add *** nhé");
    expect(maskContacts("chuyển khoản trước").flagged).toBe(true);
  });
  it("leaves normal text untouched", () => {
    const r = maskContacts("See you at 7pm, 2 hours is fine");
    expect(r.text).toBe("See you at 7pm, 2 hours is fine");
    expect(r.flagged).toBe(false);
  });
  it("does not mask words containing a keyword", () => {
    expect(maskContacts("Stkinson").flagged).toBe(false);
  });
});
