import { describe, expect, it, vi } from "vitest";
import { encodeCompetitionClass } from "~/lib/competition-classes";
import {
  type ExportLayout,
  type ExportRegistrationIdentity,
} from "~/lib/competition-export-layout";
import {
  compileCompetitionExport,
  exportCatalogFingerprint,
  exportLayoutFingerprint,
  sanitizeExportSheetName,
} from "~/server/services/competition-export-presentation";

vi.mock("~/server/sanity/client", () => ({ client: {} }));
import {
  exportRegistration,
  toCompetitionDTO,
} from "~/server/admin/competition-service";

const event = {
  _id: "synthetic-event",
  _rev: "rev-1",
  catalogs: {
    national: ["ลูกควาย", "รุ่นพิเศษ"],
    province: ["ลูกควายท้องถิ่น"],
  },
};
const row = (
  extra: Partial<ExportRegistrationIdentity> = {},
): ExportRegistrationIdentity & { microchip?: string } => ({
  _id: "r1",
  rawType: "ลูกควาย",
  level: "national",
  color: "black",
  sex: "male",
  ...extra,
});
function layout(): ExportLayout {
  return {
    version: 1,
    reviewedCatalogFingerprint: exportCatalogFingerprint(event.catalogs),
    aliases: [],
    categories: [
      {
        id: "calf-black",
        level: "national",
        catalogValue: "ลูกควาย",
        registrationTypeValues: ["ลูกควาย"],
        posterNumber: "01",
        fullLabelTh: "รุ่นลูกควายดำ อายุ 10 ถึง 18 เดือน",
        shortLabelTh: "ลูกดำ",
        groups: [
          { color: "black", sex: "male" },
          { color: "black", sex: "female" },
        ],
      },
      {
        id: "calf-albino",
        level: "national",
        catalogValue: "ลูกควาย",
        registrationTypeValues: ["ลูกควาย"],
        posterNumber: "05",
        fullLabelTh: "รุ่นลูกควายเผือก อายุ 10 ถึง 18 เดือน",
        shortLabelTh: "ลูกเผือก",
        groups: [{ color: "albino", sex: "male" }],
      },
    ],
  };
}
const compile = (registrations = [row()], proposed: unknown = layout()) =>
  compileCompetitionExport({ event, registrations, layout: proposed });

describe("source-owned competition export compiler", () => {
  it("uses configured category and subgroup order, translates exact aliases, preserves row order and never mutates input", () => {
    const registrations = [
      row({ _id: "albino", color: "albino" }),
      row({ _id: "female", sex: "female" }),
      row({ _id: "male-2", sex: " Male ", level: "ประเทศ", color: "ดำ" }),
      row({ _id: "male-1" }),
    ];
    const before = structuredClone(registrations);
    const result = compile(registrations);
    expect(result.state).toBe("ready");
    expect(result.diagnostics).toEqual([]);
    expect(result.groups.map((g) => g.registrationIds)).toEqual([
      ["male-2", "male-1"],
      ["female"],
      ["albino"],
    ]);
    expect(
      result.groups.map((g) => [g.colorLabel, g.sexLabel, g.levelLabel]),
    ).toEqual([
      ["ดำ", "ผู้", "ระดับประเทศ"],
      ["ดำ", "เมีย", "ระดับประเทศ"],
      ["เผือก", "ผู้", "ระดับประเทศ"],
    ]);
    expect(registrations).toEqual(before);
  });

  it("supports a second event with a different order and no event-specific branch", () => {
    const proposed = layout();
    proposed.categories.reverse();
    const result = compileCompetitionExport({
      event: { ...event, _id: "another-event" },
      registrations: [row(), row({ _id: "albino", color: "albino" })],
      layout: proposed,
    });
    expect(result.groups.map((g) => g.posterNumber)).toEqual(["05", "01"]);
    expect(result.groups[0]?.key).not.toBe(
      compile([row({ color: "albino" })]).groups[0]?.key,
    );
  });

  it("skips empty categories without renumbering and handles a reviewed empty event", () => {
    const result = compile([row({ color: "albino" })]);
    expect(result.groups.map((g) => g.posterNumber)).toEqual(["05"]);
    expect(compile([])).toMatchObject({ state: "ready", groups: [] });
  });

  it("blocks missing, unsupported, malformed and stale layouts without a fallback", () => {
    expect(compile([row()], null)).toMatchObject({
      state: "missing-layout",
      groups: [],
    });
    for (const proposed of [
      { version: 2 },
      { ...layout(), categories: "invalid" },
    ]) {
      expect(compile([row()], proposed).state).toBe("needs-review");
    }
    expect(
      compile([row()], {
        ...layout(),
        reviewedCatalogFingerprint: "a".repeat(64),
      }).diagnostics,
    ).toContainEqual(expect.objectContaining({ code: "STALE_CATALOG" }));
  });

  it("keeps raw class identity before the legacy display name is normalized", () => {
    const encoded = encodeCompetitionClass({
      name: "ชื่อเหมือนกัน",
      kind: "special",
      minMonths: null,
      maxMonths: null,
      minInclusive: true,
      group: "กลุ่มหนึ่ง",
      criteria: "เกณฑ์หนึ่ง",
    });
    const normalized = exportRegistration(
      {
        _id: "raw",
        _rev: "r",
        type: encoded,
        buffaloAge: 0,
      },
      toCompetitionDTO({ _id: "e", _rev: "r", eventType: "normal" }),
    );
    expect(normalized.rawType).toBe(encoded);
    expect(normalized.type).toBe("ชื่อเหมือนกัน");
    expect(normalized.exportAge).toBe(0);
    expect(normalized.ageSource).toBe("stored");
  });

  it("never merges distinct exact classes with identical display labels", () => {
    const proposed = layout();
    proposed.categories[1] = {
      ...proposed.categories[0]!,
      id: "different-class",
      catalogValue: "รุ่นพิเศษ",
      registrationTypeValues: ["รุ่นพิเศษ"],
    };
    const result = compile(
      [row(), row({ _id: "special", rawType: "รุ่นพิเศษ" })],
      proposed,
    );
    expect(result.state).toBe("ready");
    expect(result.groups).toHaveLength(2);
    expect(new Set(result.groups.map((g) => g.key)).size).toBe(2);
    expect(
      new Set(result.groups.map((g) => g.sheetName.toLowerCase())).size,
    ).toBe(2);
  });

  it("merges reviewed exact class aliases only inside their single category/subgroup", () => {
    const proposed = layout();
    proposed.categories[0]!.registrationTypeValues.push("ลูกควายเดิม");
    const result = compile(
      [row(), row({ _id: "alias", rawType: "ลูกควายเดิม" })],
      proposed,
    );
    expect(result.state).toBe("ready");
    expect(result.groups[0]?.registrationIds).toEqual(["r1", "alias"]);
  });

  it("blocks overlapping raw tuples, duplicate IDs and duplicated subgroups even without applicants", () => {
    const overlapping = layout();
    overlapping.categories.push({
      ...overlapping.categories[0]!,
      id: "overlap",
    });
    expect(compile([], overlapping).diagnostics).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_BINDING" }),
    );
    const duplicate = layout();
    duplicate.categories[1]!.id = duplicate.categories[0]!.id;
    expect(compile([], duplicate).diagnostics).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_CATEGORY_ID" }),
    );
    duplicate.categories[0]!.groups.push({
      ...duplicate.categories[0]!.groups[0]!,
    });
    expect(compile([], duplicate).diagnostics).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_SUBGROUP" }),
    );
  });

  it("blocks unmapped, unknown and missing controlled values rather than guessing", () => {
    for (const extra of [
      { rawType: "ไม่อยู่ในแผน" },
      { color: "corrupt" },
      { sex: "" },
      { level: "corrupt" },
    ]) {
      const result = compile([row(extra)]);
      expect(result.state).toBe("needs-review");
      expect(result.diagnostics.length).toBeGreaterThan(0);
    }
    expect(compile([row({ sex: "female" })]).groups[0]?.sexLabel).toBe("เมีย");
  });

  it("allows explicit reviewed historical values and actual missing cases but never hides corrupt nonempty data as unspecified", () => {
    const proposed = layout();
    proposed.aliases = [
      {
        field: "sex",
        rawValue: "",
        canonicalValue: "unspecified",
        labelTh: "ไม่ระบุ",
      },
    ];
    proposed.categories[0]!.groups.push({ color: "black", sex: "unspecified" });
    expect(compile([row({ sex: "" })], proposed).state).toBe("ready");
    proposed.aliases[0]!.rawValue = "corrupt";
    expect(
      compile([row({ sex: "corrupt" })], proposed).diagnostics,
    ).toContainEqual(expect.objectContaining({ code: "INVALID_ALIAS" }));
    proposed.aliases = [
      { field: "sex", rawValue: "M", canonicalValue: "male", labelTh: "ผู้" },
    ];
    proposed.categories[0]!.groups.pop();
    expect(compile([row({ sex: "M" })], proposed).state).toBe("ready");
  });

  it("rejects mislabeled or redirected known values and inconsistent custom labels", () => {
    for (const alias of [
      {
        field: "sex" as const,
        rawValue: "female",
        canonicalValue: "male",
        labelTh: "ผู้",
      },
      {
        field: "color" as const,
        rawValue: "old-albino",
        canonicalValue: "albino",
        labelTh: "ดำ",
      },
    ]) {
      const proposed = layout();
      proposed.aliases = [alias];
      expect(compile([], proposed).diagnostics).toContainEqual(
        expect.objectContaining({ code: "INVALID_ALIAS" }),
      );
    }
  });

  it("requires explicit historical binding when the current catalog no longer contains the class", () => {
    const proposed = layout();
    proposed.categories[0]!.catalogValue = "รุ่นที่ลบแล้ว";
    expect(compile([row()], proposed).diagnostics).toContainEqual(
      expect.objectContaining({ code: "UNKNOWN_CATALOG_BINDING" }),
    );
    proposed.categories[0]!.catalogValue = undefined;
    proposed.categories[0]!.historical = true;
    expect(compile([row()], proposed).state).toBe("ready");
  });

  it("rejects duplicate registration IDs, missing raw identity and foreign event references", () => {
    expect(compile([row(), row()]).diagnostics).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_REGISTRATION_ID" }),
    );
    expect(compile([row({ rawType: "" })]).state).toBe("needs-review");
    const result = compileCompetitionExport({
      event,
      layout: layout(),
      registrations: [{ ...row(), event: { _ref: "other-event" } }],
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FOREIGN_REGISTRATION" }),
    );
  });

  it("keeps same-chip multi-level/multi-class applications as distinct IDs", () => {
    const proposed = layout();
    proposed.categories.push({
      ...proposed.categories[0]!,
      id: "local",
      level: "province",
      posterNumber: "01",
      catalogValue: "ลูกควายท้องถิ่น",
      registrationTypeValues: ["ลูกควายท้องถิ่น"],
    });
    const result = compile(
      [
        { ...row(), microchip: "00001" },
        {
          ...row({
            _id: "local",
            rawType: "ลูกควายท้องถิ่น",
            level: "จังหวัด",
          }),
          microchip: "00001",
        },
      ],
      proposed,
    );
    expect(result.state).toBe("ready");
    expect(result.groups.flatMap((g) => g.registrationIds)).toEqual([
      "r1",
      "local",
    ]);
  });

  it("allocates valid case-insensitive unique names before filtering empty groups, deterministically", () => {
    const proposed = layout();
    proposed.categories[0]!.shortLabelTh = "รุ่น'ชื่อ/ยาวมาก[]:*?\\".repeat(3);
    const result = compile([row()], proposed);
    expect(result.state).toBe("ready");
    for (const group of result.groups) {
      expect(group.sheetName.length).toBeLessThanOrEqual(31);
      expect(group.sheetName).not.toMatch(/[\[\]:*?/\\]|^'|'$/);
    }
    expect(compile([row()], proposed).groups).toEqual(result.groups);
    expect(exportLayoutFingerprint(proposed)).toBe(
      exportLayoutFingerprint(structuredClone(proposed)),
    );
    expect(exportCatalogFingerprint(event.catalogs)).not.toBe(
      exportCatalogFingerprint({
        ...event.catalogs,
        national: [...event.catalogs.national].reverse(),
      }),
    );
  });

  it("does not interpret inherited object properties as known enum values", () => {
    for (const sex of ["constructor", "toString", "__proto__"]) {
      expect(compile([row({ sex })]).diagnostics).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_CONTROLLED_VALUE" }),
      );
    }
  });

  it("blocks mixed English in configured Thai labels and category numbers while leaving personal text outside the compiler", () => {
    for (const field of [
      "fullLabelTh",
      "shortLabelTh",
      "posterNumber",
    ] as const) {
      const proposed = layout();
      proposed.categories[0]![field] = "ลูกควาย Calf";
      expect(compile([], proposed).state).toBe("needs-review");
    }
    const proposed = layout();
    proposed.aliases = [
      {
        field: "color",
        rawValue: "old-albino",
        canonicalValue: "albino",
        labelTh: "เผือก albino",
      },
    ];
    expect(compile([], proposed).state).toBe("needs-review");
  });

  it("removes quote edges after trimming without rejecting internal apostrophes", () => {
    expect(sanitizeExportSheetName("  'ลูกควาย'  ")).toBe("ลูกควาย");
    expect(sanitizeExportSheetName("  ลูก'ควาย  ")).toBe("ลูก'ควาย");
    const proposed = layout();
    proposed.categories[0]!.shortLabelTh = " 'ลูกควาย' ";
    expect(compile([row()], proposed).groups[0]?.sheetName).not.toMatch(
      /^'|'$/,
    );
  });
});
