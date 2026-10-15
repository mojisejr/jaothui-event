import { describe, expect, it } from "vitest";
import {
  getCompetitionPolicy,
  assertCompetitionRegistration,
  getAgeCutoff,
  calculateCompetitionAge,
  calculateRegistrationAge,
} from "~/server/services/competition-policy";
const event = {
  isActive: true,
  registrationActive: true,
  registrationStartAt: "2026-10-01",
  registrationDeadline: "2026-10-16",
  startAt: "2026-10-17",
  endAt: "2026-10-18",
  buffaloAgeDeadline: "2026-10-17",
};
describe("production competition policy", () => {
  it("accepts the entire Bangkok closing day and closes at local midnight", () => {
    expect(
      getCompetitionPolicy(event, new Date("2026-10-16T16:59:59.999Z"))
        .publicRegistration,
    ).toBe("open");
    expect(
      getCompetitionPolicy(event, new Date("2026-10-16T17:00:00Z"))
        .publicRegistration,
    ).toBe("closed-date");
    expect(
      getCompetitionPolicy(event, new Date("2026-09-30T16:59:59Z"))
        .publicRegistration,
    ).toBe("not-yet");
    expect(
      getCompetitionPolicy(event, new Date("2026-09-30T17:00:00Z"))
        .publicRegistration,
    ).toBe("open");
  });
  it("keeps onsite independent, but never past event end or manual event close", () => {
    const now = new Date("2026-10-18T16:59:59Z");
    expect(
      getCompetitionPolicy({ ...event, registrationActive: false }, now)
        .onsiteAllowed,
    ).toBe(true);
    expect(
      getCompetitionPolicy(event, new Date("2026-10-18T17:00:00Z"))
        .onsiteAllowed,
    ).toBe(false);
    expect(() =>
      assertCompetitionRegistration(
        { ...event, competitionState: "closed" },
        "onsite",
        now,
      ),
    ).toThrow();
  });
  it("hides drafts and fails closed for invalid managed dates without changing legacy reads", () => {
    const now = new Date("2026-10-15T00:00:00Z");
    expect(
      getCompetitionPolicy({ ...event, competitionState: "draft" }, now)
        .publicVisible,
    ).toBe(false);
    expect(
      getCompetitionPolicy(
        {
          ...event,
          competitionState: "published",
          registrationDeadline: undefined,
        },
        now,
      ).publicRegistration,
    ).toBe("invalid");
    expect(
      getCompetitionPolicy({ isActive: true }, now).warnings.length,
    ).toBeGreaterThan(0);
  });
  it("uses age cutoff independently from signup deadline and preserves ceiling months", () => {
    expect(getAgeCutoff(event)).toBe("2026-10-17");
    expect(calculateCompetitionAge("2025-10-16", "2026-10-16")).toBe(12);
    expect(calculateCompetitionAge("2025-10-16", getAgeCutoff(event))).toBe(13);
    expect(() =>
      calculateCompetitionAge("2027-01-01", getAgeCutoff(event)),
    ).toThrow();
  });
});

it("preserves Royal albino one-day age adjustment at a class boundary", () => {
  const royal = { ...event, eventType: "royal" };
  expect(calculateRegistrationAge(royal, "2025-10-17", "black")).toBe(12);
  expect(calculateRegistrationAge(royal, "2025-10-17", "albino")).toBe(13);
  expect(
    calculateRegistrationAge(
      { ...event, eventType: "normal" },
      "2025-10-17",
      "albino",
    ),
  ).toBe(12);
});
