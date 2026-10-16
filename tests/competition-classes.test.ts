import { describe, expect, it } from "vitest";
import {
  COMPETITION_CLASS_PREFIX,
  classDisplayName,
  encodeCompetitionClass,
  getEligibleCompetitionClasses,
  isCompetitionClassEligible,
  normalizeClassName,
  parseCompetitionClass,
  validateCompetitionCatalog,
  type CompetitionClass,
} from "~/lib/competition-classes";
import {
  getPossibleEvents,
  getSpecialEvents,
  findExactAgeMatch,
  parseAgeRanges,
} from "~/utils/getPossibleEvents";
import { calculateCompetitionAge } from "~/server/services/competition-policy";
const rule: CompetitionClass = {
  name: "รุ่นทดสอบ",
  kind: "age",
  minMonths: 12,
  maxMonths: 15,
  minInclusive: false,
  group: "ควายงาม",
  criteria: "",
};
describe("schema-compatible class eligibility", () => {
  it.each([
    "มากกว่า 12 เดือน ถึง 15 เดือน",
    "รุ่นอายุมากกว่า ๑๒ เดือน แต่ไม่เกิน ๑๕ เดือน",
    "มากกว่า12ถึง15",
  ])("enforces strict minimum and inclusive maximum: %s", (label) => {
    expect(
      [9, 12, 13, 15, 16].map((age) => isCompetitionClassEligible(age, label)),
    ).toEqual([false, false, true, true, false]);
  });
  it.each(["รุ่นอายุ ๑๐ เดือน แต่ไม่เกิน ๑๒ เดือน", "อายุ10แต่ไม่เกิน12"])(
    "parses a poster's inclusive range: %s",
    (label) => {
      expect(
        [9, 10, 12, 13].map((age) => isCompetitionClassEligible(age, label)),
      ).toEqual([false, true, true, false]);
    },
  );
  it.each([
    "รุ่นควายรุ่น (Intermediate division) มากกว่า 18 เดือน ถึง 20 เดือน",
    "รุ่นควายหนุ่ม-สาว (Junior division) มากกว่า 18 เดือน ถึง 20 เดือน",
    "รุ่นควายโตเต็มวัย (Senior division) มากกว่า 18 เดือน ถึง 20 เดือน",
  ])("retains known descriptive legacy divisions: %s", (label) => {
    expect(
      [18, 19, 20, 21].map((age) => isCompetitionClassEligible(age, label)),
    ).toEqual([false, true, true, false]);
  });
  it("recognizes explicit special age suffix without inferring teeth ages", () => {
    expect(
      isCompetitionClassEligible(
        19,
        "[SP]รุ่นควายแคระ รวมสี ฟันน้ำนม อายุไม่เกิน 18 เดือน",
      ),
    ).toBe(false);
    expect(
      isCompetitionClassEligible(
        18,
        "[SP]รุ่นควายแคระ รวมสี ฟันน้ำนม อายุ 18 เดือนขึ้นไป",
      ),
    ).toBe(true);
    expect(
      isCompetitionClassEligible(
        17,
        "[SP]รุ่นควายแคระ รวมสี ฟันน้ำนม อายุ 18 เดือนขึ้นไป",
      ),
    ).toBe(false);
    expect(
      parseCompetitionClass("รุ่นอายุมากกว่า มากกว่า 12 เดือน ถึง 15 เดือน"),
    ).toBeNull();
    expect(
      parseCompetitionClass(
        "รุ่นไม่เกิน 10 เดือน มากกว่า 12 เดือน ถึง 15 เดือน",
      ),
    ).toBeNull();
  });
  it("uses ceiling months at boundaries and calendar leap/month ends", () => {
    expect(
      ["2026-01-16", "2025-10-17", "2025-10-16", "2025-07-16"].map((d) =>
        calculateCompetitionAge(d, "2026-10-17"),
      ),
    ).toEqual([10, 12, 13, 16]);
    expect(calculateCompetitionAge("2024-02-29", "2025-02-28")).toBe(12);
    expect(calculateCompetitionAge("2026-01-31", "2026-02-28")).toBe(1);
  });
  it("returns decoded labels and never automatically assigns SP", () => {
    const raw = encodeCompetitionClass(rule),
      special = encodeCompetitionClass({
        ...rule,
        name: "ฟันแท้",
        kind: "special",
      });
    expect(getPossibleEvents(9, [raw, special])).toEqual([]);
    expect(getPossibleEvents(13, [raw, special])).toEqual([rule.name]);
    expect(
      findExactAgeMatch(13, parseAgeRanges([special, raw]))?.original,
    ).toBe(rule.name);
    expect(getSpecialEvents([special])).toEqual([]);
    expect(getSpecialEvents([special], 12)).toEqual([]);
    expect(getSpecialEvents([special], 13)).toEqual(["[SP] ฟันแท้"]);
    expect(getSpecialEvents([special], 16)).toEqual([]);
    expect(getEligibleCompetitionClasses(13, [raw, special])).toEqual([
      rule.name,
      "[SP] ฟันแท้",
    ]);
    expect(normalizeClassName(special)).toBe("ฟันแท้");
  });
  it("leaves teeth and calf-age eligibility manual without mistaking calf for mother", () => {
    for (const label of [
      "รุ่นฟันน้ำนม",
      "รุ่นฟันแท้ 1–2 คู่",
      "[SP] แม่พันธุ์มีลูกตาม อายุลูกไม่เกิน 4 เดือน",
      "[SP] แท็คทีมจูงควาย",
    ]) {
      expect(parseCompetitionClass(label)?.kind).toBe("special");
      expect(isCompetitionClassEligible(60, label)).toBe(true);
    }
  });
  it.each([
    "@jaothui/class:v2:{}",
    COMPETITION_CLASS_PREFIX + "{",
    COMPETITION_CLASS_PREFIX + JSON.stringify({ ...rule, minMonths: 15 }),
    COMPETITION_CLASS_PREFIX + JSON.stringify({ ...rule, kind: "unknown" }),
    "อายุประมาณ 12 เดือน",
    "[SP] ขั้นต่ำสิบเดือน",
    "[SP] รุ่นพิเศษ 15 เดือน",
  ])("fails closed for unknown or ambiguous rules: %s", (raw) => {
    expect(parseCompetitionClass(raw)).toBeNull();
    expect(getPossibleEvents(13, [raw])).toEqual([]);
    expect(getSpecialEvents([raw], 13)).toEqual([]);
  });
  it("rejects invalid bounds, oversized strings and colliding display names", () => {
    for (const patch of [
      { minMonths: 15 },
      { minMonths: -1 },
      { maxMonths: 1201 },
      { minMonths: 1.5 },
      { minMonths: null, maxMonths: null },
    ])
      expect(() => encodeCompetitionClass({ ...rule, ...patch })).toThrow();
    expect(() =>
      encodeCompetitionClass({ ...rule, name: "@jaothui/class:v1:forged" }),
    ).toThrow();
    expect(() =>
      encodeCompetitionClass({ ...rule, criteria: "x".repeat(1001) }),
    ).toThrow();
    expect(
      validateCompetitionCatalog([
        encodeCompetitionClass(rule),
        encodeCompetitionClass({ ...rule, minMonths: 1 }),
      ]),
    ).toHaveLength(1);
    expect(
      validateCompetitionCatalog(["[SP] รุ่นพิเศษ", "รุ่นพิเศษ"]),
    ).toHaveLength(1);
    expect(classDisplayName(encodeCompetitionClass(rule))).not.toContain(
      "@jaothui",
    );
  });
});
