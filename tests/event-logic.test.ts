import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { filterAdminActiveEvents } from "~/server/services/event-visibility.service";

type EventForVisibility = {
  eventId: string;
  isActive: boolean;
  registrationActive?: boolean;
  registrationStartAt?: string;
  registrationDeadline?: string;
  deadline?: string;
  endAt?: string;
};

/**
 * Existing public user visibility rule from getRegistrationOpenEvents.
 */
function isVisibleForUser(event: EventForVisibility, now: Date): boolean {
  if (!event.isActive) return false;
  if (event.registrationActive === false) return false;

  if (event.registrationStartAt) {
    const startDate = new Date(event.registrationStartAt);
    if (now < startDate) return false;
  }

  if (event.registrationDeadline) {
    const deadlineDate = new Date(event.registrationDeadline);
    if (now > deadlineDate) return false;
  }

  if (!event.registrationDeadline && event.deadline) {
    const fallbackDeadline = new Date(event.deadline);
    if (now > fallbackDeadline) return false;
  }

  return true;
}

describe("event visibility logic for admin registration journey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Case 1: normal operation -> admin and user both see event", () => {
    vi.setSystemTime(new Date("2026-02-19T10:00:00.000Z"));
    const now = new Date();

    const normalEvent: EventForVisibility = {
      eventId: "event-normal",
      isActive: true,
      registrationActive: true,
      registrationStartAt: "2026-02-10T00:00:00.000Z",
      registrationDeadline: "2026-02-22T00:00:00.000Z",
      endAt: "2026-02-25T00:00:00.000Z",
    };

    const adminVisibleEvents = filterAdminActiveEvents([
      normalEvent as unknown as Parameters<typeof filterAdminActiveEvents>[0][number],
    ], now);
    expect(adminVisibleEvents).toHaveLength(1);
    expect(isVisibleForUser(normalEvent, now)).toBe(true);
  });

  it("Case 2: post-deadline but before event end -> admin sees, user does not", () => {
    vi.setSystemTime(new Date("2026-02-24T10:00:00.000Z"));
    const now = new Date();

    const postDeadlineEvent: EventForVisibility = {
      eventId: "event-post-deadline",
      isActive: true,
      registrationActive: true,
      registrationStartAt: "2026-02-10T00:00:00.000Z",
      registrationDeadline: "2026-02-23T00:00:00.000Z",
      endAt: "2026-02-25T00:00:00.000Z",
    };

    const adminVisibleEvents = filterAdminActiveEvents([
      postDeadlineEvent as unknown as Parameters<typeof filterAdminActiveEvents>[0][number],
    ], now);
    expect(adminVisibleEvents).toHaveLength(1);
    expect(isVisibleForUser(postDeadlineEvent, now)).toBe(false);
  });

  it("Case 3: event over -> admin and user both do not see event", () => {
    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
    const now = new Date();

    const endedEvent: EventForVisibility = {
      eventId: "event-ended",
      isActive: true,
      registrationActive: true,
      registrationDeadline: "2026-02-25T00:00:00.000Z",
      endAt: "2026-02-26T00:00:00.000Z",
    };

    const adminVisibleEvents = filterAdminActiveEvents([
      endedEvent as unknown as Parameters<typeof filterAdminActiveEvents>[0][number],
    ], now);
    expect(adminVisibleEvents).toHaveLength(0);
    expect(isVisibleForUser(endedEvent, now)).toBe(false);
  });

  it("Case 4: inactive status -> admin and user both do not see event", () => {
    vi.setSystemTime(new Date("2026-02-19T10:00:00.000Z"));
    const now = new Date();

    const inactiveEvent: EventForVisibility = {
      eventId: "event-inactive",
      isActive: false,
      registrationActive: true,
      registrationDeadline: "2026-02-23T00:00:00.000Z",
      endAt: "2026-02-25T00:00:00.000Z",
    };

    const adminVisibleEvents = filterAdminActiveEvents([
      inactiveEvent as unknown as Parameters<typeof filterAdminActiveEvents>[0][number],
    ], now);
    expect(adminVisibleEvents).toHaveLength(0);
    expect(isVisibleForUser(inactiveEvent, now)).toBe(false);
  });

  it("Case 5: registration not open yet -> admin sees for preparation, user does not", () => {
    vi.setSystemTime(new Date("2026-02-15T10:00:00.000Z"));
    const now = new Date();

    const preRegistrationEvent: EventForVisibility = {
      eventId: "event-pre-registration",
      isActive: true,
      registrationActive: true,
      registrationStartAt: "2026-02-20T00:00:00.000Z",
      registrationDeadline: "2026-02-26T00:00:00.000Z",
      endAt: "2026-02-27T00:00:00.000Z",
    };

    const adminVisibleEvents = filterAdminActiveEvents([
      preRegistrationEvent as unknown as Parameters<typeof filterAdminActiveEvents>[0][number],
    ], now);
    expect(adminVisibleEvents).toHaveLength(1);
    expect(isVisibleForUser(preRegistrationEvent, now)).toBe(false);
  });
});
