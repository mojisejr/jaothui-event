export type NormalCompetitionLevel = "ประเทศ" | "จังหวัด";
export type NormalClassOptions = {
  nationalTypes: string[];
  provinceTypes: string[];
  specialNationalTypes: string[];
  specialProvinceTypes: string[];
};
export const emptyNormalClassOptions: NormalClassOptions = {
  nationalTypes: [],
  provinceTypes: [],
  specialNationalTypes: [],
  specialProvinceTypes: [],
};
/** These are already eligible display labels from the authoritative catalog API. */
export function normalClassOptions(options: NormalClassOptions, level: string) {
  return level === "ประเทศ"
    ? { regular: options.nationalTypes, special: options.specialNationalTypes }
    : level === "จังหวัด"
      ? {
          regular: options.provinceTypes,
          special: options.specialProvinceTypes,
        }
      : { regular: [], special: [] };
}
export function reconcileNormalSelection(
  selection: { level: string; type: string },
  options: NormalClassOptions,
  previousLevel = selection.level,
) {
  const classes = normalClassOptions(options, selection.level);
  return {
    ...selection,
    type:
      previousLevel === selection.level &&
      [...classes.regular, ...classes.special].includes(selection.type)
        ? selection.type
        : "",
  };
}
/** National first; province is the applicant's later choice. Regular classes outrank SP-only levels. */
export function defaultNormalLevel(
  options: NormalClassOptions,
): NormalCompetitionLevel | "" {
  if (options.nationalTypes.length) return "ประเทศ";
  if (options.provinceTypes.length) return "จังหวัด";
  if (options.specialNationalTypes.length) return "ประเทศ";
  if (options.specialProvinceTypes.length) return "จังหวัด";
  return "";
}
/** Fills an empty level and a missing class with the age class; SP is never chosen automatically. */
export function suggestNormalSelection(
  selection: { level: string; type: string },
  options: NormalClassOptions,
  previousLevel = selection.level,
) {
  const level = selection.level || defaultNormalLevel(options);
  const kept = reconcileNormalSelection(
    { level, type: selection.type },
    options,
    previousLevel,
  );
  return {
    level,
    type: kept.type || (normalClassOptions(options, level).regular[0] ?? ""),
  };
}
export const nextNormalLevel = (level: string): NormalCompetitionLevel =>
  level === "ประเทศ" ? "จังหวัด" : "ประเทศ";
export function normalizeCompetitionLevel(
  value: unknown,
): "national" | "province" | null {
  if (typeof value !== "string") return null;
  const level = value.trim();
  if (level === "national" || level === "ประเทศ") return "national";
  if (level === "province" || level === "จังหวัด") return "province";
  return null;
}
/** Unknown legacy levels must never silently exempt an existing entry. */
export function requiresLevelDuplicateOverride(
  eventType: unknown,
  level: unknown,
  entries: Array<{ level?: unknown }>,
) {
  if (eventType !== "normal") return entries.length > 0;
  const target = normalizeCompetitionLevel(level);
  return entries.some((entry) => {
    const previous = normalizeCompetitionLevel(entry.level);
    return target === null || previous === null || previous === target;
  });
}

/** Authentication may refresh while request identity and business data stay frozen. */
export function withCurrentRegistrationAuthorization<
  T extends { idToken?: string; lineAccessToken?: string },
>(request: T, auth: { idToken?: string; lineAccessToken?: string }): T {
  return {
    ...request,
    idToken: auth.idToken,
    lineAccessToken: auth.idToken ? undefined : auth.lineAccessToken,
  };
}
/** Only exact source errors raised after strong replay lookup and before writes may unlock editing. */
export function isSafeNormalRegistrationFailure(error: {
  message: string;
  data?: { code?: unknown } | null;
}) {
  return (
    error.data?.code === "BAD_REQUEST" &&
    [
      "รุ่นการแข่งขันไม่ตรงกับอายุหรือชุดรุ่นของงาน",
      "กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้",
      "วันเกิดหรือวันตัดอายุไม่ถูกต้อง",
      "วันเกิดไม่ถูกต้อง",
      "ระดับการแข่งขันไม่ถูกต้อง",
      "ไม่พบงานแข่งขัน",
      "กรุณาใช้แบบฟอร์ม Royal พร้อมรูปและที่อยู่",
    ].includes(error.message)
  );
}
