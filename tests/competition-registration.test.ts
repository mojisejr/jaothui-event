import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getDocument: vi.fn(),
  patch: vi.fn(),
  create: vi.fn(),
  commit: vi.fn(),
  increment: vi.fn(),
}));
vi.mock("~/server/sanity/client", () => ({
  client: {
    getDocument: mocks.getDocument,
    fetch: mocks.fetch,
    transaction: () => ({ patch: mocks.patch }),
  },
}));
import { createNewRegister } from "~/server/services/register-event.service";
import { createRoyalCompetitionRegistration } from "~/server/services/competition-registration.service";
import { verifyApplicantIdToken } from "~/server/services/line-auth.service";
const event = {
  _id: "event",
  _rev: "rev-1",
  competitionState: "published",
  isActive: true,
  registrationActive: true,
  startAt: "2026-10-17",
  endAt: "2026-10-18",
  registrationStartAt: "2026-10-01",
  registrationDeadline: "2026-10-16",
  buffaloAgeDeadline: "2026-10-17",
};
const data = {
  operationId: "00000000-0000-4000-8000-000000000001",
  userId: "line-user",
  eventId: "event",
  birthday: "2025-10-16",
  type: "มากกว่า 12 เดือน ถึง 15 เดือน",
  level: "ประเทศ",
  name: "fixture",
  sex: "male",
  color: "black",
  microchip: "test",
  ownerName: "fixture",
  ownerTel: "000",
  buffaloAge: 99,
  fatherName: "f",
  motherName: "m",
  farmName: "f",
  province: "p",
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
  vi.clearAllMocks();
  mocks.getDocument.mockImplementation(async (id: string) =>
    id === "event" ? mocks.fetch() : null,
  );
  const chain = { create: mocks.create, commit: mocks.commit };
  mocks.patch.mockImplementation((_id, callback) => {
    const patch = {
      ifRevisionId: vi.fn().mockReturnThis(),
      setIfMissing: vi.fn().mockReturnThis(),
      inc: mocks.increment.mockReturnThis(),
    };
    callback(patch);
    return chain;
  });
  mocks.create.mockReturnValue(chain);
  mocks.commit.mockResolvedValue([event, { _id: "registration" }]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("guarded production registration writes", () => {
  it("rejects closed/stale direct submissions before any mutation", async () => {
    mocks.fetch.mockResolvedValue({ ...event, registrationActive: false });
    await expect(createNewRegister(data)).rejects.toThrow("ไม่เปิดรับสมัคร");
    expect(mocks.patch).not.toHaveBeenCalled();
  });
  it("recomputes age, validates actual catalog and fences create on source revision", async () => {
    mocks.fetch
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce([{ data: [data.type] }]);
    const result = await createNewRegister(data);
    expect(result?._id).toBe("registration");
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      buffaloAge: 13,
      type: data.type,
    });
    expect(mocks.patch).toHaveBeenCalledWith("event", expect.any(Function));
    expect(mocks.increment).toHaveBeenCalledWith({
      competitionWriteFence: 1,
      competitionRegistrationCount: 1,
    });
  });
  it("never accepts forged age or class outside event catalog", async () => {
    mocks.fetch
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce([{ data: ["มากกว่า 20 เดือน ถึง 25 เดือน"] }]);
    await expect(
      createNewRegister({ ...data, type: "invented" }),
    ).rejects.toThrow("รุ่นการแข่งขัน");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("propagates revision conflicts instead of returning success or retrying stale rules", async () => {
    mocks.fetch
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce([{ data: [data.type] }]);
    mocks.commit.mockRejectedValue(new Error("revision conflict"));
    await expect(createNewRegister(data)).rejects.toThrow("revision conflict");
    expect(mocks.commit).toHaveBeenCalledTimes(1);
  });
  it("Royal closure is enforced before supplementary writes and notification", async () => {
    mocks.fetch.mockResolvedValue({
      ...event,
      eventType: "royal",
      competitionState: "closed",
    });
    await expect(
      createRoyalCompetitionRegistration({
        ...data,
        address: "a",
        district: "d",
        amphoe: "a",
        zipcode: "z",
        imageIds: [],
      }),
    ).rejects.toThrow("ไม่เปิดรับสมัคร");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
describe("LINE verification", () => {
  it("rejects absent tokens and mismatching verified identity", async () => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "123");
    await expect(verifyApplicantIdToken("", "line-user")).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: "someone-else",
          aud: "123",
          exp: Date.now() / 1000 + 60,
        }),
      }),
    );
    await expect(
      verifyApplicantIdToken("token", "line-user"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("accepts only official verification for matching audience/subject and unexpired token", async () => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "123");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: "line-user",
        aud: "123",
        exp: Date.now() / 1000 + 60,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await verifyApplicantIdToken("token", "line-user")).toBe(
      "line-user",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.line.me/oauth2/v2.1/verify",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("Royal atomic document graph", () => {
  it("commits all four documents with ownership and never stores caller token fields", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ ...event, eventType: "royal" })
      .mockResolvedValueOnce([{ data: [data.type] }])
      .mockResolvedValueOnce(5);
    const input = {
      ...data,
      address: "a",
      district: "d",
      amphoe: "a",
      zipcode: "z",
      imageIds: ["a", "b", "c", "d", "e"],
      idToken: "must-not-persist",
    };
    const result = await createRoyalCompetitionRegistration(input);
    expect(result.registration._id).toBe("registration");
    expect(mocks.create).toHaveBeenCalledTimes(4);
    const registration = mocks.create.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(registration).not.toHaveProperty("idToken");
    expect(registration.buffaloAge).toBe(13);
    const image = mocks.create.mock.calls[1]![0] as {
      eventRegister: { _ref: string };
    };
    expect(image.eventRegister._ref).toBe(registration._id);
    expect(mocks.commit).toHaveBeenCalledTimes(1);
  });
  it("rejects assets owned by another event/applicant before any write", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ ...event, eventType: "royal" })
      .mockResolvedValueOnce([{ data: [data.type] }])
      .mockResolvedValueOnce(0);
    await expect(
      createRoyalCompetitionRegistration({
        ...data,
        address: "a",
        district: "d",
        amphoe: "a",
        zipcode: "z",
        imageIds: ["a", "b", "c", "d", "e"],
      }),
    ).rejects.toThrow("รูปภาพไม่ตรง");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("idempotent public operations", () => {
  it("returns the already persisted registration on browser retry without any new writes", async () => {
    const { registrationIdentity } = await import(
      "~/server/services/competition-idempotency.service"
    );
    const identity = registrationIdentity(data, data);
    mocks.getDocument.mockResolvedValue({
      _id: identity.id,
      registrationRequestHash: identity.hash,
    });
    const result = await createNewRegister(data);
    expect(result?._id).toBe(identity.id);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rejects changed applicant data under an already used operation ID", async () => {
    mocks.getDocument.mockResolvedValue({
      _id: "old",
      registrationRequestHash: "different",
    });
    await expect(createNewRegister(data)).rejects.toThrow("คำขอนี้ถูกใช้");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not allow the normal endpoint to bypass Royal images/address", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ ...event, eventType: "royal" })
      .mockResolvedValueOnce([{ data: [data.type] }]);
    await expect(createNewRegister(data)).rejects.toThrow("Royal");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
