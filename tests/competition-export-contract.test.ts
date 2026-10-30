import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/competition-export-contract.json";
import { exportLayoutSchema } from "~/lib/competition-export-layout";
import { compileCompetitionExport } from "~/server/services/competition-export-presentation";
vi.mock("~/server/sanity/client", () => ({ client: {} }));
import {
  exportRegistration,
  toCompetitionDTO,
} from "~/server/admin/competition-service";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
/** This checked-in JSON is copied byte-for-byte to Dashboard, without CI cross-repo imports.
 * It was generated once with the actual source functions, then frozen as a wire-contract regression.
 * Regeneration requires review in BOTH repositories; ordinary test runs never write the fixture.
 */
describe("synthetic source-to-Dashboard export golden contract #123", () => {
  it.each(fixture.scenarios)(
    "keeps the actual source wire packet stable for $name",
    (scenario) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(fixture.clock));
      vi.stubEnv("COMPETITION_LINE_NOTIFICATIONS_ENABLED", "false");
      const event = toCompetitionDTO(scenario.sourceEvent);
      const registrations = scenario.rawRegistrations.map((raw) =>
        exportRegistration(raw, event),
      );
      const layout = exportLayoutSchema.parse(scenario.layout);
      const exportPlan = compileCompetitionExport({
        event,
        registrations,
        layout,
      });
      const actual = {
        event,
        registrations,
        rowCount: registrations.length,
        registrationPolicyVersion: 1,
        exportPresentationVersion: 1,
        exportPlan,
      };
      // Undefined source-only properties are absent on the actual JSON HTTP wire.
      expect(JSON.parse(JSON.stringify(actual))).toEqual(scenario.packet);
      expect(exportPlan.state).toBe("ready");
      expect(exportPlan.groups).toHaveLength(3);
      expect(registrations.map((row) => row.rawType)).toEqual(
        scenario.rawRegistrations.map((row) => row.type),
      );
      expect(registrations.map((row) => row.exportAge)).toEqual([0, 13, null]);
      expect(registrations.map((row) => row.ageSource)).toEqual([
        "stored",
        "cutoff",
        "missing",
      ]);
      expect(registrations[0]!.type).toBe("ลูกควายตามเกณฑ์อายุ");
      expect(scenario.packet.registrations[0]!.microchip).toBe(
        "000000000000001",
      );
      const statuses =
        scenario.name === "normal"
          ? ["registered", "registered", "registered"]
          : scenario.name === "royal"
            ? ["accepted", "rejected", "pending"]
            : ["needs_type_review", "needs_type_review", "needs_type_review"];
      expect(registrations.map((row) => row.registrationStatus)).toEqual(
        statuses,
      );
      expect(registrations.map((row) => row.approvalStatus)).toEqual([
        "accepted",
        "rejected",
        "pending",
      ]);
      expect(
        exportPlan.groups.flatMap((group) => group.registrationIds).sort(),
      ).toEqual(scenario.rawRegistrations.map((row) => row._id).sort());
      expect(
        exportPlan.groups.every(
          (group) =>
            group.sheetName.length <= 31 && group.sheetName.includes("'"),
        ),
      ).toBe(true);
      expect(
        new Set(exportPlan.groups.map((group) => group.sheetName.toLowerCase()))
          .size,
      ).toBe(3);
    },
  );
  it("keeps different organizer orders in different events rather than a global hardcoded order", () => {
    const normal = fixture.scenarios.find(
      (scenario) => scenario.name === "normal",
    )!;
    const royal = fixture.scenarios.find(
      (scenario) => scenario.name === "royal",
    )!;
    expect(
      normal.packet.exportPlan.groups.map((group) => group.categoryId),
    ).toEqual(["historical-class", "local-class", "age-class"]);
    expect(
      royal.packet.exportPlan.groups.map((group) => group.categoryId),
    ).toEqual(["age-class", "local-class", "historical-class"]);
  });
});
