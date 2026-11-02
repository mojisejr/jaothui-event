import type { NextApiRequest } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  line: vi.fn(),
  create: vi.fn(),
  getMember: vi.fn(),
  stats: vi.fn(),
  register: vi.fn(),
  royal: vi.fn(),
  history: vi.fn(),
  status: vi.fn(),
  pass: vi.fn(),
  admin: vi.fn(),
  legacy: vi.fn(),
  detail: vi.fn(),
}));
vi.mock("~/server/db", () => ({ db: {} }));
vi.mock("~/server/sanity/client", () => ({ client: {} }));
vi.mock("~/server/services/line-auth.service", () => ({
  verifyApplicantAuthorization: mocks.line,
}));
vi.mock("~/server/services/user.service", () => ({
  getUserByUserId: mocks.getMember,
  getProfileStatsByUserId: mocks.stats,
  createNewUser: mocks.create,
}));
vi.mock("~/server/services/register-event.service", () => ({
  canRgister: vi.fn(),
  createNewRegister: mocks.register,
  getAllRegisteredBy: mocks.legacy,
  getById: mocks.detail,
  getRegisterByEvent: vi.fn(),
}));
vi.mock("~/server/services/competition-registration.service", () => ({
  createRoyalCompetitionRegistration: mocks.royal,
}));
vi.mock("~/server/services/admin.service", () => ({ isAdmin: mocks.admin }));
vi.mock("~/server/messaging/notification", () => ({ notify: vi.fn() }));
vi.mock("~/server/services/competition-applicant-checkin", () => ({
  CompetitionApplicantCheckInService: class {
    historyForOwner = mocks.history;
    statusForOwner = mocks.status;
    passForOwner = mocks.pass;
  },
  applicantCheckInError: (e: unknown) => {
    throw e;
  },
}));
import { userRouter } from "~/server/api/routers/user";
import { registerEventRouter } from "~/server/api/routers/register-event";
import {
  createTRPCContext,
  createTRPCRouter,
  admin,
  royalAdmin,
} from "~/server/api/trpc";
import {
  SSO_COOKIE,
  SSO_MODE_COOKIE,
} from "~/server/services/front-sso.service";
const token = "s".repeat(43);
const req = () =>
  ({
    method: "POST",
    cookies: { [SSO_COOKIE]: token },
    headers: { origin: "http://127.0.0.1:3001", "x-jaothui-csrf": "1" },
    query: {},
  }) as unknown as NextApiRequest;
const dto = {
  userId: "line-a",
  eventId: "event-a",
  operationId: "ec749d15-b39e-4279-89a7-6bb934957712",
  type: "normal",
  level: "ประเทศ",
  name: "Fixture",
  sex: "male" as const,
  color: "black" as const,
  birthdate: "2025-01-01",
  microchip: "000",
  ownerName: "Fixture",
  ownerTel: "000",
  fatherName: "father",
  motherName: "mother",
  farmName: "farm",
  buffaloAge: 12,
  province: "province",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("JAOTHUI_EVENT_SSO_ENABLED", "true");
  vi.stubEnv("JAOTHUI_FRONT_ORIGIN", "http://127.0.0.1:3000");
  vi.stubEnv("JAOTHUI_EVENT_ORIGIN", "http://127.0.0.1:3001");
  vi.stubEnv("JAOTHUI_EVENT_SSO_CLIENT_SECRET", "s".repeat(32));
  vi.stubEnv("JAOTHUI_EVENT_SSO_STATE_SECRET", "s".repeat(32));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              expiresAt: new Date(Date.now() + 60000).toISOString(),
              account: {
                accountId: "account-a",
                lineId: "line-a",
                displayName: "fixture",
                avatarUrl: null,
                email: null,
              },
            },
          }),
        ),
      ),
    ),
  );
  mocks.royal.mockResolvedValue({
    replayed: true,
    registration: { _id: "royal-entry" },
  });
  mocks.getMember.mockResolvedValue({ role: "ADMIN" });
  mocks.line.mockResolvedValue("line-legacy");
  mocks.admin.mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("all applicant routers derive the same server owner", () => {
  it("binds member get/create/stats, Normal/Royal, history/status/pass and legacy history", async () => {
    const ctx = { userId: "forged-admin", req: req(), db: {} as never },
      users = userRouter.createCaller(ctx),
      registrations = registerEventRouter.createCaller(ctx);
    expect(await users.getById({ userId: "line-a" })).toMatchObject({
      role: "USER",
    });
    await users.getProfileStats({ userId: "line-a" });
    await users.create({ userId: "line-a", name: "name", tel: "000" });
    await registrations.register(dto);
    await registrations.registerRoyalEvent({
      ...dto,
      address: "address",
      amphoe: "a",
      district: "d",
      zipcode: "10000",
      buffaloImage: "i1",
      buffaloImage2: "i2",
      frontImage: "i3",
      sideImage: "i4",
      backImage: "i5",
    });
    await registrations.ownedHistory({});
    await registrations.ownedStatus({ registrationId: "entry" });
    await registrations.applicantPass({ registrationId: "entry" });
    await registrations.getAllRegisteredBy({ userId: "line-a" });
    expect(mocks.getMember).toHaveBeenCalledWith("line-a");
    expect(mocks.stats).toHaveBeenCalledWith("line-a");
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "line-a" }),
    );
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "line-a" }),
    );
    expect(mocks.royal).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "line-a" }),
    );
    expect(mocks.history).toHaveBeenCalledWith("line-a");
    expect(mocks.status).toHaveBeenCalledWith("line-a", "entry");
    expect(mocks.pass).toHaveBeenCalledWith("line-a", "entry");
    expect(mocks.legacy).toHaveBeenCalledWith("line-a");
    expect(mocks.line).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(9);
  });
  it("forged payloads and cross-site writes stop before member/registration persistence", async () => {
    const ctx = { userId: "line-b", req: req(), db: {} as never };
    await expect(
      userRouter
        .createCaller(ctx)
        .create({ userId: "line-b", name: "b", tel: "000" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      registerEventRouter
        .createCaller(ctx)
        .register({ ...dto, userId: "line-b" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    ctx.req.headers.origin = "https://evil.example";
    await expect(
      registerEventRouter.createCaller(ctx).register(dto),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
  });
  it("SSO never receives legacy admin/royal privileges even with a claimed admin payload", async () => {
    const router = createTRPCRouter({
      admin: admin.query(() => true),
      royal: royalAdmin.query(() => true),
    });
    const ctx = { userId: "forged-admin", req: req(), db: {} as never };
    await expect(router.createCaller(ctx).admin()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(router.createCaller(ctx).royal()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mocks.admin).not.toHaveBeenCalled();
    ctx.req.cookies = { [SSO_MODE_COOKIE]: "front" };
    await expect(router.createCaller(ctx).admin()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(router.createCaller(ctx).royal()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    ctx.req.body = { "0": { json: { userId: "forged-admin" } } };
    expect(
      createTRPCContext({ req: ctx.req, res: {} as never }).userId,
    ).toBeNull();
  });
  it("legacy direct LIFF owner remains verified and independent of client context", async () => {
    const caller = userRouter.createCaller({
      userId: "forged",
      db: {} as never,
      req: {
        ...req(),
        cookies: {},
        method: "GET",
        headers: { "x-line-id-token": "legacy" },
      } as unknown as NextApiRequest,
    });
    await caller.getById({ userId: "line-legacy" });
    expect(mocks.line).toHaveBeenCalledWith(
      { idToken: "legacy" },
      "line-legacy",
    );
    expect(mocks.getMember).toHaveBeenCalledWith("line-legacy");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("direct LIFF Normal/Royal/history retain verification and exact owner", async () => {
    const caller = registerEventRouter.createCaller({
      userId: "untrusted",
      req: { ...req(), cookies: {} } as NextApiRequest,
      db: {} as never,
    });
    await caller.register({ ...dto, userId: "line-legacy", idToken: "legacy" });
    await caller.registerRoyalEvent({
      ...dto,
      userId: "line-legacy",
      lineAccessToken: "legacy-access",
      address: "address",
      amphoe: "a",
      district: "d",
      zipcode: "10000",
      buffaloImage: "i1",
      buffaloImage2: "i2",
      frontImage: "i3",
      sideImage: "i4",
      backImage: "i5",
    });
    await caller.ownedHistory({ idToken: "legacy" });
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "line-legacy" }),
    );
    expect(mocks.royal).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "line-legacy" }),
    );
    expect(mocks.history).toHaveBeenCalledWith("line-legacy");
    expect(mocks.line).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("legacy detail read uses ownership and cannot borrow SSO admin privilege", async () => {
    const caller = registerEventRouter.createCaller({
      userId: "forged-admin",
      db: {} as never,
      req: { ...req(), method: "GET" } as NextApiRequest,
    });
    mocks.detail.mockResolvedValue({ _id: "entry", user: { _id: "line-b" } });
    await expect(caller.getById({ id: "entry" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(mocks.admin).not.toHaveBeenCalled();
    mocks.detail.mockResolvedValue({ _id: "entry", user: { _id: "line-a" } });
    expect(await caller.getById({ id: "entry" })).toMatchObject({
      _id: "entry",
    });
  });
});
