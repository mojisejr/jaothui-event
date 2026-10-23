import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const stubs = vi.hoisted(() => ({
  fetch: vi.fn(),
  patch: vi.fn(),
  notify: vi.fn(),
  verify: vi.fn(),
  vote: vi.fn(),
}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/sanity/client", () => ({
  client: { fetch: stubs.fetch, patch: stubs.patch },
}));
vi.mock("~/server/services/line-auth.service", () => ({
  verifyApplicantAuthorization: stubs.verify,
}));
vi.mock("~/server/messaging/notification", () => ({ notify: stubs.notify }));
vi.mock("~/server/services/votes-v2.service", () => ({
  canVote: stubs.vote,
  createNewVoteEvent: stubs.vote,
  getAllVoteEvents: stubs.vote,
  getEventById: stubs.vote,
  voteFor: stubs.vote,
}));
import { adminRouter } from "~/server/api/routers/admin";
import { registerEventRouter } from "~/server/api/routers/register-event";
import { royalAdminRoutes } from "~/server/api/routers/royal-admin";
import { votesRouterV2 } from "~/server/api/routers/votes-v2";
import {
  approve,
  getAddress,
  getImages,
  getApprovement,
  getAllRegistered,
} from "~/server/services/royal.service";
import {
  createAdminRegister,
  checkDuplicateMicrochip,
} from "~/server/services/admin-register.service";
import { getRegisterByEvent } from "~/server/services/register-event.service";

const ctx = { userId: "forged-admin-id", db: {} as never };
const admin = adminRouter.createCaller(ctx);
const royal = royalAdminRoutes.createCaller(ctx);
const registrations = registerEventRouter.createCaller(ctx);
const dto = {
  eventId: "event",
  userId: "forged-admin-id",
  type: "รุ่น",
  level: "ประเทศ",
  name: "test",
  sex: "male" as const,
  color: "black" as const,
  birthday: "2025-01-01",
  microchip: "synthetic",
  ownerName: "test",
  ownerTel: "000",
  fatherName: "f",
  motherName: "m",
  farmName: "farm",
  buffaloAge: 12,
  province: "p",
};
beforeEach(() => {
  vi.stubEnv("COMPETITION_LEGACY_ADMIN_DISABLED", "true");
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
const moved = {
  code: "FORBIDDEN",
  message: expect.stringContaining("COMPETITION_ADMIN_MOVED"),
};

describe("real legacy competition procedures and services", () => {
  it("blocks direct forged-userId calls before authorization lookup, mutation or LINE", async () => {
    const calls = [
      () => admin.getActiveEvents(),
      () => admin.checkDuplicate({ eventId: "event", microchip: "chip" }),
      () => admin.registerAdminEvent(dto),
      () =>
        registrations.getAllRegisterByEvent({
          eventId: "event",
          userId: "forged-admin-id",
        }),
      () =>
        royal.getAllRegistered({ eventId: "event", userId: "forged-admin-id" }),
      () =>
        royal.getAddress({
          eventId: "event",
          userId: "forged-admin-id",
          targetId: "entry",
        }),
      () =>
        royal.getImages({
          eventId: "event",
          userId: "forged-admin-id",
          targetId: "entry",
        }),
      () =>
        royal.getApprovement({
          eventId: "event",
          userId: "forged-admin-id",
          targetId: "entry",
        }),
      () =>
        royal.approve({
          targetId: "victim",
          docId: "approval",
          result: true,
          userId: "forged-admin-id",
          ownerName: "x",
          microchip: "chip",
          buffaloName: "x",
        }),
    ];
    for (const call of calls) await expect(call()).rejects.toMatchObject(moved);
    expect(stubs.fetch).not.toHaveBeenCalled();
    expect(stubs.patch).not.toHaveBeenCalled();
    expect(stubs.verify).not.toHaveBeenCalled();
    expect(stubs.notify).not.toHaveBeenCalled();
  });
  it("guards service entrypoints as well, before catch blocks can swallow the cutover", async () => {
    for (const call of [
      () => createAdminRegister(dto),
      () => checkDuplicateMicrochip("event", "chip"),
      () => getRegisterByEvent("event"),
      () => getAllRegistered("event"),
      () => getAddress("event", "entry"),
      () => getImages("event", "entry"),
      () => getApprovement("event", "entry"),
      () => approve("approval", true),
    ])
      await expect(call()).rejects.toMatchObject(moved);
    expect(stubs.fetch).not.toHaveBeenCalled();
    expect(stubs.patch).not.toHaveBeenCalled();
  });
  it("does not automatically restore legacy access when dashboard writes and LINE are disabled", async () => {
    vi.stubEnv("JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED", "false");
    vi.stubEnv("COMPETITION_LINE_NOTIFICATIONS_ENABLED", "false");
    await expect(admin.registerAdminEvent(dto)).rejects.toMatchObject(moved);
    expect(stubs.fetch).not.toHaveBeenCalled();
  });
  it.each([undefined, "false"])(
    "preserves legacy authorization and reads before cutover (%s)",
    async (flag) => {
      vi.stubEnv("COMPETITION_LEGACY_ADMIN_DISABLED", flag);
      stubs.fetch
        .mockResolvedValueOnce({ role: "ADMIN" })
        .mockResolvedValueOnce({ province: "synthetic" });
      expect(
        await royal.getAddress({
          eventId: "event",
          userId: "forged-admin-id",
          targetId: "entry",
        }),
      ).toEqual({ province: "synthetic" });
      expect(stubs.fetch).toHaveBeenCalledTimes(2);
    },
  );
  it("retains legacy auth denial with the switch off", async () => {
    vi.stubEnv("COMPETITION_LEGACY_ADMIN_DISABLED", "false");
    stubs.fetch.mockResolvedValueOnce({ role: "USER" });
    await expect(
      royal.getAddress({
        eventId: "event",
        userId: "not-admin",
        targetId: "entry",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(stubs.fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps public approval status, application detail/history and duplicate lookup available", async () => {
    stubs.fetch.mockResolvedValue({ _id: "approval", approvementResult: true });
    expect(await royal.getStatus("approval")).toMatchObject({
      approvementResult: true,
    });
    await registrations.getById({ id: "entry" });
    await registrations.getAllRegisteredBy({ userId: "applicant" });
    await registrations.canRgister({ eventId: "event", microchip: "chip" });
    expect(stubs.fetch).toHaveBeenCalledTimes(4);
  });
  it("preserves public registration credential checks instead of applying the admin cutover guard", async () => {
    stubs.verify.mockRejectedValue(new Error("PUBLIC_APPLICANT_AUTH_CHECK"));
    const normal = {
      ...dto,
      birthdate: dto.birthday,
      operationId: "00000000-0000-4000-8000-000000000001",
    };
    await expect(registrations.register(normal)).rejects.toThrow(
      "PUBLIC_APPLICANT_AUTH_CHECK",
    );
    await expect(
      registrations.registerRoyalEvent({
        ...normal,
        address: "a",
        amphoe: "a",
        district: "d",
        zipcode: "00000",
        buffaloImage: "image",
        buffaloImage2: "image2",
        frontImage: "front",
        sideImage: "side",
        backImage: "back",
      }),
    ).rejects.toThrow("PUBLIC_APPLICANT_AUTH_CHECK");
    expect(stubs.verify).toHaveBeenCalledTimes(2);
    expect(stubs.fetch).not.toHaveBeenCalled();
  });
  it("does not alter vote routes, including vote mutation", async () => {
    stubs.vote.mockResolvedValue({ unchanged: true });
    const votes = votesRouterV2.createCaller(ctx);
    expect(await votes.getAllEvents()).toEqual({ unchanged: true });
    expect(
      await votes.voteFor({
        eventId: "vote-event",
        candidateId: "candidate",
        voterId: "voter",
      }),
    ).toEqual({ unchanged: true });
    expect(stubs.vote).toHaveBeenCalledWith("vote-event", "candidate", "voter");
  });
});
