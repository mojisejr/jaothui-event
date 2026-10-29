import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NormalClassSelector } from "~/components/Events/NormalClassSelector";
import {
  normalClassOptions,
  reconcileNormalSelection,
  suggestNormalSelection,
  defaultNormalLevel,
  nextNormalLevel,
  requiresLevelDuplicateOverride,
  normalizeCompetitionLevel,
  withCurrentRegistrationAuthorization,
  isSafeNormalRegistrationFailure,
} from "~/lib/normal-competition-levels";
import { encodeCompetitionClass } from "~/lib/competition-classes";
import { getPossibleEvents, getSpecialEvents } from "~/utils/getPossibleEvents";
const raw = encodeCompetitionClass({
  name: "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน",
  kind: "age",
  minMonths: 24,
  maxMonths: 36,
  minInclusive: false,
  group: "",
  criteria: "",
});
const special = encodeCompetitionClass({
  name: "ท้องถิ่น",
  kind: "special",
  minMonths: 10,
  maxMonths: 18,
  minInclusive: true,
  group: "",
  criteria: "ตรวจสิทธิ์ท้องถิ่น",
});
const options = {
  nationalTypes: ["ลูกควาย"],
  provinceTypes: [],
  specialNationalTypes: ["[SP] ควายใหญ่"],
  specialProvinceTypes: ["[SP] ท้องถิ่น"],
};
describe("normal explicit level selection", () => {
  it("keeps an explicit national choice when both levels have eligible classes", () => {
    const both = { ...options, provinceTypes: ["ลูกควายจังหวัด"] };
    expect(
      reconcileNormalSelection({ level: "ประเทศ", type: "ลูกควาย" }, both),
    ).toEqual({ level: "ประเทศ", type: "ลูกควาย" });
    expect(
      reconcileNormalSelection({ level: "จังหวัด", type: "ลูกควาย" }, both),
    ).toEqual({ level: "จังหวัด", type: "" });
    expect(reconcileNormalSelection({ level: "", type: "" }, both)).toEqual({
      level: "",
      type: "",
    });
  });
  it("invalidates only a stale class, without choosing a level for the applicant", () => {
    expect(
      reconcileNormalSelection({ level: "ประเทศ", type: "too young" }, options),
    ).toEqual({ level: "ประเทศ", type: "" });
    expect(normalClassOptions(options, "จังหวัด")).toEqual({
      regular: [],
      special: ["[SP] ท้องถิ่น"],
    });
    expect(nextNormalLevel("ประเทศ")).toBe("จังหวัด");
    expect(nextNormalLevel("จังหวัด")).toBe("ประเทศ");
  });
  it("retains structured 32-month labels and bounded special eligibility", () => {
    expect(getPossibleEvents(32, [raw])).toEqual([
      "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน",
    ]);
    expect(getSpecialEvents([special], 9)).toEqual([]);
    expect(getSpecialEvents([special], 18)).toEqual(["[SP] ท้องถิ่น"]);
    expect(getSpecialEvents([special], 19)).toEqual([]);
  });
  it("renders both level controls and visible regular/special radios with large targets", () => {
    const html = renderToStaticMarkup(
      React.createElement(NormalClassSelector, {
        options,
        level: "ประเทศ",
        value: "ลูกควาย",
        loading: false,
        disabled: false,
        onLevelChange: () => {},
        onClassChange: () => {},
      }),
    );
    expect(html).toContain("ระดับประเทศ");
    expect(html).toContain("ระดับจังหวัด / ท้องถิ่น");
    expect(html).toContain("รุ่นตามอายุ");
    expect(html).toContain("รุ่นพิเศษ");
    expect(html).toContain("ควายใหญ่");
    expect(html).toContain("min-h-12");
    expect(html).toContain("text-base");
    expect(html).not.toContain("text-[10px]");
    expect(html).not.toContain("สมัครรุ่นพิเศษ?");
  });
});
describe("normal onsite duplicate scope", () => {
  it("normalizes known aliases and keeps unknown values conservative", () => {
    expect(normalizeCompetitionLevel("ประเทศ")).toBe("national");
    expect(normalizeCompetitionLevel("province")).toBe("province");
    expect(normalizeCompetitionLevel(" จังหวัด ")).toBe("province");
    expect(normalizeCompetitionLevel(undefined)).toBeNull();
    expect(normalizeCompetitionLevel("somewhere")).toBeNull();
  });
  it("allows only known cross-level normal entries without override", () => {
    expect(
      requiresLevelDuplicateOverride("normal", "province", [
        { level: "ประเทศ" },
      ]),
    ).toBe(false);
    expect(
      requiresLevelDuplicateOverride("normal", "national", [
        { level: "จังหวัด" },
      ]),
    ).toBe(false);
    expect(
      requiresLevelDuplicateOverride("normal", "province", [
        { level: "province" },
      ]),
    ).toBe(true);
    expect(requiresLevelDuplicateOverride("normal", "province", [{}])).toBe(
      true,
    );
    expect(
      requiresLevelDuplicateOverride("royal", "province", [
        { level: "ประเทศ" },
      ]),
    ).toBe(true);
    expect(
      requiresLevelDuplicateOverride(undefined, "province", [
        { level: "ประเทศ" },
      ]),
    ).toBe(true);
    expect(requiresLevelDuplicateOverride("normal", "province", [])).toBe(
      false,
    );
  });
});

describe("normal registration recovery", () => {
  it("refreshes only the authentication envelope while retaining operation and business bytes", () => {
    const pending = Object.freeze({
      operationId: "original-operation",
      userId: "original-user",
      eventId: "event",
      microchip: "same-chip",
      level: "ประเทศ",
      type: "ลูกควาย",
      idToken: "expired-token",
      lineAccessToken: "old-access",
    });
    const refreshed = withCurrentRegistrationAuthorization(pending, {
      idToken: "current-token",
      lineAccessToken: "new-access",
    });
    expect(refreshed).toEqual({
      ...pending,
      idToken: "current-token",
      lineAccessToken: undefined,
    });
    expect(pending.idToken).toBe("expired-token");
    expect(
      withCurrentRegistrationAuthorization(pending, {
        lineAccessToken: "new-access",
      }),
    ).toEqual({
      ...pending,
      idToken: undefined,
      lineAccessToken: "new-access",
    });
  });
  it("allows editing only after an exact proven pre-write validation failure", () => {
    expect(
      isSafeNormalRegistrationFailure({
        message: "รุ่นการแข่งขันไม่ตรงกับอายุหรือชุดรุ่นของงาน",
        data: { code: "BAD_REQUEST" },
      }),
    ).toBe(true);
    expect(
      isSafeNormalRegistrationFailure({
        message: "กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้",
        data: { code: "BAD_REQUEST" },
      }),
    ).toBe(true);
    for (const error of [
      { message: "Network error" },
      { message: "revision conflict", data: { code: "BAD_REQUEST" } },
      {
        message: "คำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว กรุณาโหลดหน้าใหม่",
        data: { code: "BAD_REQUEST" },
      },
      { message: "กรุณาเข้าสู่ระบบใหม่", data: { code: "UNAUTHORIZED" } },
      { message: "กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้" },
    ])
      expect(isSafeNormalRegistrationFailure(error)).toBe(false);
  });
  it("clears same-named class selection when the applicant explicitly changes level", () => {
    const sameNames = { ...options, provinceTypes: ["ลูกควาย"] };
    expect(
      reconcileNormalSelection(
        { level: "จังหวัด", type: "ลูกควาย" },
        sameNames,
        "ประเทศ",
      ),
    ).toEqual({ level: "จังหวัด", type: "" });
  });
});

describe("normal automatic selection after microchip lookup", () => {
  const both = {
    nationalTypes: ["ลูกควาย", "ควายรุ่น"],
    provinceTypes: [],
    specialNationalTypes: ["[SP] ควายใหญ่"],
    specialProvinceTypes: ["[SP] ท้องถิ่น ลูกควาย"],
  };
  it("starts at national with the first age class when national has one", () => {
    expect(suggestNormalSelection({ level: "", type: "" }, both)).toEqual({
      level: "ประเทศ",
      type: "ลูกควาย",
    });
    expect(
      defaultNormalLevel({ ...both, provinceTypes: ["ลูกควายจังหวัด"] }),
    ).toBe("ประเทศ");
  });
  it("lets the applicant switch to province only, without auto-picking SP", () => {
    expect(
      suggestNormalSelection(
        { level: "จังหวัด", type: "ลูกควาย" },
        both,
        "ประเทศ",
      ),
    ).toEqual({ level: "จังหวัด", type: "" });
    expect(
      suggestNormalSelection(
        { level: "จังหวัด", type: "" },
        { ...both, provinceTypes: ["ลูกควายจังหวัด"] },
        "ประเทศ",
      ),
    ).toEqual({ level: "จังหวัด", type: "ลูกควายจังหวัด" });
  });
  it("keeps a valid manual choice, including SP, and an explicit level", () => {
    expect(
      suggestNormalSelection({ level: "ประเทศ", type: "[SP] ควายใหญ่" }, both),
    ).toEqual({ level: "ประเทศ", type: "[SP] ควายใหญ่" });
    expect(
      suggestNormalSelection({ level: "ประเทศ", type: "ควายรุ่น" }, both),
    ).toEqual({ level: "ประเทศ", type: "ควายรุ่น" });
  });
  it("falls back to province when only province has an age class", () => {
    const provinceOnly = {
      ...both,
      nationalTypes: [],
      provinceTypes: ["ลูกควายจังหวัด"],
    };
    expect(
      suggestNormalSelection({ level: "", type: "" }, provinceOnly),
    ).toEqual({ level: "จังหวัด", type: "ลูกควายจังหวัด" });
  });
  it("chooses a level but no class when only SP classes are eligible", () => {
    const spOnly = { ...both, nationalTypes: [] };
    expect(suggestNormalSelection({ level: "", type: "" }, spOnly)).toEqual({
      level: "ประเทศ",
      type: "",
    });
    expect(
      suggestNormalSelection(
        { level: "", type: "" },
        {
          nationalTypes: [],
          provinceTypes: [],
          specialNationalTypes: [],
          specialProvinceTypes: [],
        },
      ),
    ).toEqual({ level: "", type: "" });
  });
  it("re-selects the age class after a new microchip changes eligible classes", () => {
    expect(
      suggestNormalSelection(
        { level: "ประเทศ", type: "ลูกควาย" },
        { ...both, nationalTypes: ["ควายหนุ่ม"] },
      ),
    ).toEqual({ level: "ประเทศ", type: "ควายหนุ่ม" });
  });
});
