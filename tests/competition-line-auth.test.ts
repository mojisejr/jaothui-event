import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyApplicantAuthorization } from "~/server/services/line-auth.service";
const response = (data: Record<string, unknown>) => ({
  ok: true,
  json: async () => data,
});
beforeEach(() => vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "123"));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("verified LIFF access token compatibility", () => {
  it("verifies audience/expiry then obtains subject from official profile", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ client_id: "123", expires_in: 100 }))
      .mockResolvedValueOnce(response({ userId: "applicant" }));
    vi.stubGlobal("fetch", fetch);
    expect(
      await verifyApplicantAuthorization(
        { lineAccessToken: "access" },
        "applicant",
      ),
    ).toBe("applicant");
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.line.me/oauth2/v2.1/verify?access_token=access",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://api.line.me/v2/profile",
      expect.objectContaining({
        headers: { Authorization: "Bearer access" },
        cache: "no-store",
      }),
    );
  });
  it.each([
    { client_id: "other", expires_in: 100 },
    { client_id: "123", expires_in: 0 },
    { client_id: "123", expires_in: -1 },
  ])(
    "rejects invalid channel or expired credential before profile: %j",
    async (result) => {
      const fetch = vi.fn().mockResolvedValueOnce(response(result));
      vi.stubGlobal("fetch", fetch);
      await expect(
        verifyApplicantAuthorization(
          { lineAccessToken: "access" },
          "applicant",
        ),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects a forged applicant user ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response({ client_id: "123", expires_in: 100 }))
        .mockResolvedValueOnce(response({ userId: "someone-else" })),
    );
    await expect(
      verifyApplicantAuthorization({ lineAccessToken: "access" }, "applicant"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("never downgrades invalid ID tokens or accepts ambiguous credential input", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);
    await expect(
      verifyApplicantAuthorization({ idToken: "invalid" }, "applicant"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockClear();
    await expect(
      verifyApplicantAuthorization(
        { idToken: "invalid", lineAccessToken: "valid" },
        "applicant",
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("fails closed on verification timeout without exposing token or raw network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new DOMException("sensitive network details", "TimeoutError"),
        ),
    );
    await expect(
      verifyApplicantAuthorization({ lineAccessToken: "access" }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "กรุณาเข้าสู่ระบบ LINE ใหม่เพื่อยืนยันตัวตน",
    });
  });
});
