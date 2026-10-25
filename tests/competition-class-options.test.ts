import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("~/server/sanity/client", () => ({ client: { fetch: mocks.fetch } }));
import {
  getEventTypes,
  getEventTypesWithAutoAssignment,
} from "~/server/services/event.service";
import { encodeCompetitionClass } from "~/lib/competition-classes";
const age = encodeCompetitionClass({
  name: "ควายงาม 13–15",
  kind: "age",
  minMonths: 12,
  maxMonths: 15,
  minInclusive: false,
  group: "ควายงาม",
  criteria: "",
});
const special = encodeCompetitionClass({
  name: "ฟันแท้",
  kind: "special",
  minMonths: 14,
  maxMonths: null,
  minInclusive: true,
  group: "ยักษ์",
  criteria: "เจ้าหน้าที่ตรวจฟัน",
});
beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.fetch.mockImplementation(async (query: string) =>
    query.includes("provinceEventType") ? null : { data: [age, special] },
  );
});
it("public selectors expose only human labels and keep bounded specials out below minimum", async () => {
  expect(await getEventTypes("event", 13)).toEqual({
    provinceTypes: [],
    nationalTypes: ["ควายงาม 13–15"],
  });
  const below = await getEventTypesWithAutoAssignment("event", 13);
  expect(below.specialNationalTypes).toEqual([]);
  expect(below.autoAssignment).toMatchObject({
    success: true,
    competitionLevel: "ประเทศ",
    competitionType: "ควายงาม 13–15",
  });
  expect(JSON.stringify(below)).not.toContain("@jaothui");
  const accepted = await getEventTypesWithAutoAssignment("event", 14);
  expect(accepted.specialNationalTypes).toEqual(["[SP] ฟันแท้"]);
  expect(accepted.autoAssignment.competitionType).toBe("ควายงาม 13–15");
});
it("does not offer younger animals an upward normal class or autoassign special-only catalogs", async () => {
  expect(
    (await getEventTypesWithAutoAssignment("event", 9)).autoAssignment.success,
  ).toBe(false);
  const older = await getEventTypesWithAutoAssignment("event", 20);
  expect(older.nationalTypes).toEqual([]);
  expect(older.specialNationalTypes).toEqual(["[SP] ฟันแท้"]);
  expect(older.autoAssignment.success).toBe(false);
});
