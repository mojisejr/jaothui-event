import { describe, expect, it } from "vitest";
import { calculateProfileStats } from "~/server/services/profile-stats.service";

describe("calculateProfileStats", () => {
  it("returns zeros when there are no registers", () => {
    const stats = calculateProfileStats([], new Date("2026-03-16T10:00:00.000Z"));

    expect(stats).toEqual({
      activeBuffaloCount: 0,
      activeEventCount: 0,
      evaluatedRegisterCount: 0,
    });
  });

  it("does not count past events", () => {
    const stats = calculateProfileStats(
      [
        {
          _id: "reg-1",
          event: {
            _id: "event-1",
            endAt: "2026-03-15T10:00:00.000Z",
            isActive: true,
          },
        },
      ],
      new Date("2026-03-16T10:00:00.000Z"),
    );

    expect(stats).toEqual({
      activeBuffaloCount: 0,
      activeEventCount: 0,
      evaluatedRegisterCount: 1,
    });
  });

  it("counts multiple active registers in same event as one active event", () => {
    const stats = calculateProfileStats(
      [
        {
          _id: "reg-1",
          event: {
            _id: "event-1",
            endAt: "2026-03-20T10:00:00.000Z",
            isActive: true,
          },
        },
        {
          _id: "reg-2",
          event: {
            _id: "event-1",
            endAt: "2026-03-20T10:00:00.000Z",
            isActive: true,
          },
        },
      ],
      new Date("2026-03-16T10:00:00.000Z"),
    );

    expect(stats).toEqual({
      activeBuffaloCount: 2,
      activeEventCount: 1,
      evaluatedRegisterCount: 2,
    });
  });

  it("does not count events with isActive false even if endAt is in future", () => {
    const stats = calculateProfileStats(
      [
        {
          _id: "reg-1",
          event: {
            _id: "event-1",
            endAt: "2026-03-20T10:00:00.000Z",
            isActive: false,
          },
        },
      ],
      new Date("2026-03-16T10:00:00.000Z"),
    );

    expect(stats).toEqual({
      activeBuffaloCount: 0,
      activeEventCount: 0,
      evaluatedRegisterCount: 1,
    });
  });

  it("ignores invalid and missing event data without throwing", () => {
    const stats = calculateProfileStats(
      [
        {
          _id: "reg-1",
          event: {
            _id: "event-1",
            endAt: "not-a-date",
            isActive: true,
          },
        },
        {
          _id: "reg-2",
          event: null,
        },
        {
          _id: "reg-3",
          event: {
            _id: "event-3",
            isActive: true,
          },
        },
      ],
      new Date("2026-03-16T10:00:00.000Z"),
    );

    expect(stats).toEqual({
      activeBuffaloCount: 0,
      activeEventCount: 0,
      evaluatedRegisterCount: 3,
    });
  });
});
