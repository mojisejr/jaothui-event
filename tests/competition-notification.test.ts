import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type SanityClient } from "next-sanity";

const provider = vi.hoisted(() => ({ push: vi.fn(), construct: vi.fn() }));
vi.mock("~/server/sanity/client", () => ({ client: {} }));
vi.mock("@line/bot-sdk", () => ({
  messagingApi: {
    MessagingApiClient: class {
      constructor(config: unknown) {
        provider.construct(config);
      }
      pushMessage = provider.push;
    },
  },
}));
import { CompetitionAdminService } from "~/server/admin/competition-service";

const retryKey = "01234567-89ab-4cde-8fab-0123456789ab";
function fixture({
  state = "pending",
  recipient = "server-resolved-line-user",
  key = retryKey,
  failCommit = 0,
} = {}) {
  const approval: Record<string, any> = {
    _id: "approval",
    _rev: "approval-1",
    approvementResult: false,
    comment: "synthetic rejection reason",
    notificationState: state,
    notificationRetryKey: key,
  };
  const entry = {
    _id: "entry",
    _rev: "entry-1",
    name: "synthetic buffalo",
    ownerName: "synthetic owner",
    microchip: "synthetic-chip",
    applicant: { lineId: recipient },
    approval,
  };
  const fetch = vi.fn(
    async (_query: string, params: { id: string; registrationId: string }) =>
      params.id === "event" && params.registrationId === "entry"
        ? structuredClone(entry)
        : null,
  );
  const revisions: string[] = [];
  let commitCount = 0;
  const patch = vi.fn((id: string) => {
    expect(id).toBe("approval");
    let expectedRevision = "";
    let values = {};
    const builder = {
      ifRevisionId(revision: string) {
        expectedRevision = revision;
        return builder;
      },
      set(input: object) {
        values = input;
        return builder;
      },
      async commit() {
        if (++commitCount === failCommit)
          throw new Error("Synthetic persistence failure");
        if (expectedRevision !== approval._rev)
          throw Object.assign(new Error("Synthetic revision conflict"), {
            statusCode: 409,
          });
        revisions.push(expectedRevision);
        Object.assign(approval, values, {
          _rev: `approval-${revisions.length + 1}`,
        });
        return structuredClone(approval);
      },
    };
    return builder;
  });
  return {
    approval,
    entry,
    patch,
    service: new CompetitionAdminService({
      fetch,
      patch,
    } as unknown as SanityClient),
  };
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T00:00:00Z"));
  vi.stubEnv("COMPETITION_LINE_NOTIFICATIONS_ENABLED", "true");
  vi.stubEnv("oa_token", "synthetic-provider-token");
  provider.push.mockReset();
  provider.construct.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected real network access");
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("competition notification provider outcomes", () => {
  it("refuses a stale viewed approval revision before contacting LINE", async () => {
    const m = fixture();
    await expect(
      m.service.retryNotification("event", "entry", "approval-old"),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect(provider.push).not.toHaveBeenCalled();
    expect(m.patch).not.toHaveBeenCalled();
  });
  it("exposes uncertain state if provider acceptance cannot be persisted", async () => {
    const m = fixture({ failCommit: 2 });
    provider.push.mockResolvedValue({});
    await expect(
      m.service.retryNotification("event", "entry"),
    ).rejects.toThrow();
    expect(
      (await m.service.application("event", "entry")).approval
        .notificationState,
    ).toBe("uncertain");
    expect(provider.push).toHaveBeenCalledTimes(1);
  });
  it("records provider acceptance as sent using the server recipient and stable key", async () => {
    const m = fixture();
    provider.push.mockResolvedValue({});
    const result = await m.service.retryNotification("event", "entry");
    expect(provider.push).toHaveBeenCalledWith(
      {
        to: "server-resolved-line-user",
        messages: [
          {
            type: "text",
            text: expect.stringContaining("synthetic rejection reason"),
          },
        ],
      },
      retryKey,
    );
    expect(result.approval).toMatchObject({
      approvementResult: false,
      comment: "synthetic rejection reason",
      notificationState: "sent",
    });
    expect(provider.construct).toHaveBeenCalledWith({
      channelAccessToken: "synthetic-provider-token",
    });
  });
  it("preserves the decision on provider failure, then retries with the same recipient/content/key", async () => {
    const m = fixture();
    provider.push
      .mockRejectedValueOnce(new Error("synthetic provider failure"))
      .mockResolvedValueOnce({});
    expect(
      (await m.service.retryNotification("event", "entry")).approval,
    ).toMatchObject({
      approvementResult: false,
      comment: "synthetic rejection reason",
      notificationState: "failed",
    });
    expect(
      (await m.service.retryNotification("event", "entry")).approval
        .notificationState,
    ).toBe("sent");
    expect(provider.push.mock.calls[0]).toEqual(provider.push.mock.calls[1]);
    expect(m.patch).toHaveBeenCalledTimes(4);
  });
  it("reuses the persisted request even if applicant/profile details change", async () => {
    const m = fixture();
    provider.push
      .mockRejectedValueOnce(new Error("Synthetic timeout"))
      .mockResolvedValueOnce({});
    await m.service.retryNotification("event", "entry");
    const firstAttemptAt = m.approval.notificationFirstAttemptAt;
    m.entry.applicant.lineId = "changed-applicant-id";
    m.entry.name = "changed-name";
    m.entry.ownerName = "changed-owner";
    vi.setSystemTime(new Date("2026-10-16T23:59:59Z"));
    await m.service.retryNotification("event", "entry");
    expect(provider.push.mock.calls[1]).toEqual(provider.push.mock.calls[0]);
    expect(m.approval.notificationFirstAttemptAt).toBe(firstAttemptAt);
  });
  it("refuses a retry at the24-hour boundary before calling LINE", async () => {
    const m = fixture();
    provider.push.mockRejectedValueOnce(new Error("Synthetic timeout"));
    await m.service.retryNotification("event", "entry");
    vi.setSystemTime(new Date("2026-10-17T00:00:00Z"));
    await expect(
      m.service.retryNotification("event", "entry"),
    ).rejects.toMatchObject({ code: "NOTIFICATION_REVIEW_REQUIRED" });
    expect(provider.push).toHaveBeenCalledTimes(1);
  });
  it("does not contact LINE when the pre-send revision claim cannot persist", async () => {
    const m = fixture({ failCommit: 1 });
    await expect(m.service.retryNotification("event", "entry")).rejects.toThrow(
      "persistence failure",
    );
    expect(provider.push).not.toHaveBeenCalled();
  });
  it("rejects a simultaneous stale claim before a second provider call", async () => {
    const m = fixture();
    provider.push.mockResolvedValue({});
    const outcomes = await Promise.allSettled([
      m.service.retryNotification("event", "entry"),
      m.service.retryNotification("event", "entry"),
    ]);
    expect(
      outcomes.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(provider.push).toHaveBeenCalledTimes(1);
  });
  it("propagates result persistence failure without issuing a second provider request", async () => {
    const m = fixture({ failCommit: 2 });
    provider.push.mockResolvedValue({});
    await expect(m.service.retryNotification("event", "entry")).rejects.toThrow(
      "persistence failure",
    );
    expect(provider.push).toHaveBeenCalledTimes(1);
    expect(m.approval.notificationRetryKey).toBe(retryKey);
    expect(m.approval.notificationPayload.to).toBe("server-resolved-line-user");
    expect(m.approval.notificationFirstAttemptAt).toBe(
      "2026-10-16T00:00:00.000Z",
    );
  });
  it("recognizes an SDK409 with accepted-request evidence as already sent", async () => {
    const m = fixture();
    provider.push.mockRejectedValue({
      statusCode: 409,
      originalError: {
        response: {
          status: 409,
          headers: {
            "x-line-accepted-request-id": "accepted-provider-request",
          },
        },
      },
    });
    expect(
      (await m.service.retryNotification("event", "entry")).approval
        .notificationState,
    ).toBe("sent");
  });
  it.each([
    { statusCode: 409 },
    {
      statusCode: 409,
      originalError: {
        response: {
          status: 409,
          headers: { "x-line-accepted-request-id": "" },
        },
      },
    },
    {
      statusCode: 500,
      originalError: {
        response: {
          status: 500,
          headers: { "x-line-accepted-request-id": "unrelated" },
        },
      },
    },
  ])(
    "does not mistake an unacknowledged provider error for delivery: %j",
    async (error) => {
      const m = fixture();
      provider.push.mockRejectedValue(error);
      expect(
        (await m.service.retryNotification("event", "entry")).approval
          .notificationState,
      ).toBe("failed");
    },
  );
  it.each([{ state: "sent" }, { recipient: "" }])(
    "skips provider and persistence when sent or without LINE: %j",
    async (options) => {
      const m = fixture(options);
      await m.service.retryNotification("event", "entry");
      expect(provider.push).not.toHaveBeenCalled();
      expect(m.patch).not.toHaveBeenCalled();
    },
  );
  it("rejects a legacy approval without a stable key before contacting the provider", async () => {
    const m = fixture({ key: "" });
    await expect(
      m.service.retryNotification("event", "entry"),
    ).rejects.toMatchObject({ code: "NOTIFICATION_REVIEW_REQUIRED" });
    expect(provider.push).not.toHaveBeenCalled();
  });
});
