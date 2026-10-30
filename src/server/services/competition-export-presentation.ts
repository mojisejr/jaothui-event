import { createHash } from "node:crypto";
import {
  EXPORT_CONTROLLED_LABELS,
  EXPORT_INFORMATION_SHEET,
  EXPORT_PRESENTATION_VERSION,
  exportLayoutSchema,
  type ControlledExportAlias,
  type ExportCompilationEvent,
  type ExportControlledField,
  type ExportDiagnostic,
  type ExportGroup,
  type ExportLayout,
  type ExportPlan,
  type ExportRegistrationIdentity,
} from "~/lib/competition-export-layout";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
/** Semantic fingerprint: revision-fence-only writes must not invalidate a saved layout. */
export const exportCatalogFingerprint = (
  catalogs: ExportCompilationEvent["catalogs"],
) => digest({ national: catalogs.national, province: catalogs.province });
export const exportLayoutFingerprint = (layout: ExportLayout) =>
  digest(exportLayoutSchema.parse(layout));
const ownValue = (
  values: Record<string, string>,
  key: string,
): string | undefined =>
  Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
const normalized = (value: string) => value.trim().toLowerCase();
const builtInAliases: Record<ExportControlledField, Record<string, string>> = {
  sex: {
    male: "male",
    female: "female",
    ผู้: "male",
    เพศผู้: "male",
    เมีย: "female",
    เพศเมีย: "female",
  },
  color: {
    black: "black",
    ดำ: "black",
    albino: "albino",
    เผือก: "albino",
    white: "white",
    ขาว: "white",
    gray: "gray",
    grey: "gray",
    เทา: "gray",
    brown: "brown",
    น้ำตาล: "brown",
  },
  level: {
    national: "national",
    ประเทศ: "national",
    ระดับประเทศ: "national",
    province: "province",
    จังหวัด: "province",
    ท้องถิ่น: "province",
    ระดับจังหวัด: "province",
    "ระดับจังหวัด / ท้องถิ่น": "province",
  },
};
type ControlledValue = { key: string; label: string };
function builtIn(
  field: ExportControlledField,
  value: string,
): ControlledValue | null {
  const key = ownValue(builtInAliases[field], normalized(value));
  return key
    ? { key, label: ownValue(EXPORT_CONTROLLED_LABELS[field], key)! }
    : null;
}
export function resolveExportControlledValue(
  field: ExportControlledField,
  value: string,
  aliases: ControlledExportAlias[] = [],
): ControlledValue | null {
  const known = builtIn(field, value);
  if (known) return known;
  const alias = aliases.find(
    (item) => item.field === field && item.rawValue === value,
  );
  return alias ? { key: alias.canonicalValue, label: alias.labelTh } : null;
}
function canonicalLabel(
  field: ExportControlledField,
  key: string,
  aliases: ControlledExportAlias[],
) {
  return (
    ownValue(EXPORT_CONTROLLED_LABELS[field], key) ??
    aliases.find(
      (alias) => alias.field === field && alias.canonicalValue === key,
    )?.labelTh
  );
}
function validateAliases(
  aliases: ControlledExportAlias[],
  diagnostics: ExportDiagnostic[],
) {
  const values = new Set<string>();
  const labels = new Map<string, string>();
  for (const [index, alias] of aliases.entries()) {
    const known = builtIn(alias.field, alias.rawValue);
    const expected = ownValue(
      EXPORT_CONTROLLED_LABELS[alias.field],
      alias.canonicalValue,
    );
    const missing = alias.rawValue.trim() === "";
    const key = JSON.stringify([alias.field, alias.rawValue]);
    const labelKey = JSON.stringify([alias.field, alias.canonicalValue]);
    if (
      values.has(key) ||
      (known !== null &&
        (known.key !== alias.canonicalValue ||
          known.label !== alias.labelTh)) ||
      (expected !== undefined && expected !== alias.labelTh) ||
      (missing &&
        (alias.canonicalValue !== "unspecified" ||
          alias.labelTh !== "ไม่ระบุ")) ||
      (!missing &&
        (alias.canonicalValue === "unspecified" ||
          alias.labelTh === "ไม่ระบุ")) ||
      (!missing && !expected && !alias.canonicalValue.startsWith("custom-")) ||
      (labels.has(labelKey) && labels.get(labelKey) !== alias.labelTh)
    )
      diagnostics.push({
        code: "INVALID_ALIAS",
        message:
          "คำเทียบข้อมูลเดิมซ้ำ ขัดแย้ง หรือเปลี่ยนความหมายของค่าที่รู้จัก",
        path: `aliases.${index}`,
        value: alias.rawValue,
      });
    values.add(key);
    labels.set(labelKey, alias.labelTh);
  }
}
const tupleKey = (type: string, level: string, color: string, sex: string) =>
  JSON.stringify([type, level, color, sex]);
const truncate = (value: string, units: number) => {
  const sliced = value.slice(0, units);
  return /[\uD800-\uDBFF]$/.test(sliced) ? sliced.slice(0, -1) : sliced;
};
export const sanitizeExportSheetName = (value: string) =>
  value
    .normalize("NFC")
    .replace(/[\x00-\x1f\x7f\[\]:*?/\\]/g, "_")
    .trim()
    .replace(/^'+|'+$/g, "")
    .trim();
type SheetCandidate = {
  key: string;
  prefix: string;
  label: string;
  color: string;
  sex: string;
  categoryId: string;
  path: string;
};
function allocateSheetNames(
  candidates: SheetCandidate[],
  diagnostics: ExportDiagnostic[],
) {
  const nameFor = (candidate: SheetCandidate, marker = "") => {
    const prefix = sanitizeExportSheetName(candidate.prefix);
    const label = sanitizeExportSheetName(candidate.label) || "รุ่น";
    // Known labels, including explicitly reviewed missing data, remain complete.
    const color = truncate(sanitizeExportSheetName(candidate.color) || "สี", 8);
    const sexLabel = sanitizeExportSheetName(candidate.sex) || "เพศ";
    const sex = sexLabel === "ไม่ระบุ" ? sexLabel : truncate(sexLabel, 6);
    const tail = `-${color}-${sex}`;
    const classBudget = 31 - prefix.length - 1 - marker.length - tail.length;
    if (classBudget < 1) {
      if (
        !diagnostics.some(
          (item) =>
            item.code === "POSTER_NUMBER_TOO_LONG" &&
            item.categoryId === candidate.categoryId,
        )
      )
        diagnostics.push({
          code: "POSTER_NUMBER_TOO_LONG",
          message:
            "เลขรุ่นยาวเกินกว่าจะคงระดับ สี และเพศในชื่อชีต กรุณาย่อเลขรุ่นก่อนส่งออก",
          categoryId: candidate.categoryId,
          path: `${candidate.path}.posterNumber`,
        });
      // Keep the blocked preview schema-valid, without pretending to shorten a poster number.
      return `เลขรุ่นยาวเกิน-${digest([candidate.key, marker]).slice(0, 8)}`;
    }
    return `${prefix}-${truncate(label, classBudget)}${marker}${tail}`;
  };
  const bases = candidates.map((candidate) => nameFor(candidate));
  const counts = new Map<string, number>();
  for (const base of bases)
    counts.set(
      base.toLocaleLowerCase(),
      (counts.get(base.toLocaleLowerCase()) ?? 0) + 1,
    );
  const used = new Set([
    EXPORT_INFORMATION_SHEET.toLocaleLowerCase(),
    "history",
  ]);
  return candidates.map((candidate, index) => {
    const base = bases[index]!;
    let name = base;
    if (
      (counts.get(base.toLocaleLowerCase()) ?? 0) > 1 ||
      used.has(base.toLocaleLowerCase())
    ) {
      // All collisions get a stable suffix, rather than privileging the first row encountered.
      const marker = `-${digest(candidate.key).slice(0, 8)}`;
      name = nameFor(candidate, marker);
    }
    let attempt = 0;
    while (used.has(name.toLocaleLowerCase())) {
      const marker = `-${digest([candidate.key, ++attempt]).slice(0, 8)}`;
      name = nameFor(candidate, marker);
    }
    used.add(name.toLocaleLowerCase());
    return name;
  });
}

/** Pure presentation only: never uses age, eligibility, approval or mutable registration fields. */
export function compileCompetitionExport(input: {
  event: ExportCompilationEvent;
  registrations: ExportRegistrationIdentity[];
  layout: unknown;
}): ExportPlan {
  const { event, registrations } = input;
  const catalogFingerprint = exportCatalogFingerprint(event.catalogs);
  const diagnostics: ExportDiagnostic[] = [];
  const base = {
    version: EXPORT_PRESENTATION_VERSION,
    eventId: event._id,
    eventRevision: event._rev,
    catalogFingerprint,
    layoutFingerprint: null,
    diagnostics,
    groups: [],
  };
  if (input.layout === null || input.layout === undefined)
    return {
      ...base,
      state: "missing-layout",
      diagnostics: [
        {
          code: "MISSING_LAYOUT",
          message: "กรุณากำหนดและบันทึกรูปแบบไฟล์ของงานก่อนดาวน์โหลด",
        },
      ],
    };
  const parsed = exportLayoutSchema.safeParse(input.layout);
  if (!parsed.success)
    return {
      ...base,
      state: "needs-review",
      diagnostics: parsed.error.issues.map((issue) => ({
        code: "INVALID_LAYOUT",
        message: "รูปแบบไฟล์ไม่ครบหรือไม่รองรับ กรุณาตรวจการตั้งค่า",
        path: issue.path.join("."),
      })),
    };
  const layout = parsed.data;
  if (layout.reviewedCatalogFingerprint !== catalogFingerprint)
    diagnostics.push({
      code: "STALE_CATALOG",
      message: "ชุดรุ่นเปลี่ยนไป กรุณาตรวจและบันทึกรูปแบบไฟล์อีกครั้ง",
    });
  validateAliases(layout.aliases, diagnostics);
  const groups: ExportGroup[] = [];
  const categories = new Set<string>();
  const bindings = new Map<string, ExportGroup[]>();
  const candidates: SheetCandidate[] = [];
  for (const [categoryIndex, category] of layout.categories.entries()) {
    const path = `categories.${categoryIndex}`;
    if (categories.has(category.id))
      diagnostics.push({
        code: "DUPLICATE_CATEGORY_ID",
        message: "รหัสหมวดรุ่นซ้ำ กรุณาแยกหมวดรุ่นให้ชัดเจน",
        categoryId: category.id,
        path,
      });
    categories.add(category.id);
    const levelLabel = canonicalLabel("level", category.level, layout.aliases);
    if (!levelLabel)
      diagnostics.push({
        code: "UNKNOWN_CONTROLLED_KEY",
        message: "ยังไม่ได้กำหนดคำไทยของระดับการแข่งขัน",
        categoryId: category.id,
        value: category.level,
        path,
      });
    const catalog =
      category.level === "national"
        ? event.catalogs.national
        : category.level === "province"
          ? event.catalogs.province
          : [];
    if (
      category.catalogValue !== undefined &&
      !catalog.includes(category.catalogValue)
    )
      diagnostics.push({
        code: "UNKNOWN_CATALOG_BINDING",
        message:
          "รุ่นที่ผูกไว้ไม่อยู่ในชุดรุ่นปัจจุบัน กรุณาตรวจหรือระบุเป็นรุ่นประวัติเดิม",
        categoryId: category.id,
        value: category.catalogValue,
        path,
      });
    if (!category.catalogValue && !category.historical)
      diagnostics.push({
        code: "UNKNOWN_CATALOG_BINDING",
        message: "กรุณาผูกรุ่นจากชุดรุ่น หรือระบุว่าเป็นรุ่นประวัติเดิม",
        categoryId: category.id,
        path,
      });
    if (
      new Set(category.registrationTypeValues).size !==
      category.registrationTypeValues.length
    )
      diagnostics.push({
        code: "DUPLICATE_TYPE_ALIAS",
        message: "ค่ารุ่นเดิมซ้ำภายในหมวดเดียวกัน",
        categoryId: category.id,
        path,
      });
    if (category.registrationTypeValues.some((value) => !value.trim()))
      diagnostics.push({
        code: "MISSING_CLASS_VALUE",
        message: "ค่ารุ่นต้นทางมีแต่ช่องว่าง กรุณาผูกรุ่นที่มีข้อมูลจริง",
        categoryId: category.id,
        path: `${path}.registrationTypeValues`,
      });
    const subgroups = new Set<string>();
    for (const subgroup of category.groups) {
      const subkey = JSON.stringify([subgroup.color, subgroup.sex]);
      if (subgroups.has(subkey))
        diagnostics.push({
          code: "DUPLICATE_SUBGROUP",
          message: "กลุ่มสีและเพศซ้ำภายในรุ่น",
          categoryId: category.id,
          path,
        });
      subgroups.add(subkey);
      const colorLabel = canonicalLabel(
        "color",
        subgroup.color,
        layout.aliases,
      );
      const sexLabel = canonicalLabel("sex", subgroup.sex, layout.aliases);
      if (!colorLabel || !sexLabel)
        diagnostics.push({
          code: "UNKNOWN_CONTROLLED_KEY",
          message: "ยังไม่ได้กำหนดคำไทยของสีหรือเพศ",
          categoryId: category.id,
          path,
        });
      const key = digest([
        event._id,
        category.id,
        category.level,
        subgroup.color,
        subgroup.sex,
      ]);
      const group: ExportGroup = {
        key,
        categoryId: category.id,
        ordinal: groups.length + 1,
        posterNumber: category.posterNumber,
        sheetName: "",
        fullClassLabel: category.fullLabelTh,
        levelLabel: levelLabel ?? "",
        colorLabel: colorLabel ?? "",
        sexLabel: sexLabel ?? "",
        registrationIds: [],
      };
      groups.push(group);
      const prefix =
        category.level === "national"
          ? "ป"
          : category.level === "province"
            ? "ท"
            : "ร";
      candidates.push({
        key,
        prefix: `${prefix}${category.posterNumber}`,
        label: category.shortLabelTh,
        color: colorLabel ?? "",
        sex: sexLabel ?? "",
        categoryId: category.id,
        path,
      });
      for (const rawType of new Set(category.registrationTypeValues)) {
        const tuple = tupleKey(
          rawType,
          category.level,
          subgroup.color,
          subgroup.sex,
        );
        const matches = bindings.get(tuple) ?? [];
        matches.push(group);
        bindings.set(tuple, matches);
        if (matches.length > 1)
          diagnostics.push({
            code: "AMBIGUOUS_BINDING",
            message:
              "ข้อมูลรุ่น ระดับ สี และเพศเดียวกันถูกผูกหลายหมวด กรุณาแก้ให้เหลือหมวดเดียว",
            categoryId: category.id,
            value: rawType,
            path,
          });
      }
    }
  }
  const ids = new Set<string>();
  for (const registration of registrations) {
    if (!registration._id || ids.has(registration._id)) {
      diagnostics.push({
        code: "DUPLICATE_REGISTRATION_ID",
        message: "รหัสใบสมัครว่างหรือซ้ำ กรุณาตรวจข้อมูลต้นทาง",
        registrationIds: [registration._id],
      });
      continue;
    }
    ids.add(registration._id);
    if (
      typeof registration.rawType !== "string" ||
      !registration.rawType.trim()
    ) {
      diagnostics.push({
        code: "MISSING_CLASS_VALUE",
        message: "ใบสมัครไม่มีค่ารุ่นต้นทาง กรุณาตรวจข้อมูลก่อนส่งออก",
        registrationIds: [registration._id],
        path: "rawType",
      });
      continue;
    }
    if (
      registration.event !== undefined &&
      (!registration.event ||
        typeof registration.event !== "object" ||
        !("_ref" in registration.event) ||
        registration.event._ref !== event._id)
    ) {
      diagnostics.push({
        code: "FOREIGN_REGISTRATION",
        message: "พบใบสมัครที่ไม่ได้เป็นของงานนี้",
        registrationIds: [registration._id],
      });
      continue;
    }
    const level = resolveExportControlledValue(
      "level",
      registration.level,
      layout.aliases,
    );
    const color = resolveExportControlledValue(
      "color",
      registration.color,
      layout.aliases,
    );
    const sex = resolveExportControlledValue(
      "sex",
      registration.sex,
      layout.aliases,
    );
    if (!level || !color || !sex) {
      for (const [field, value, resolved] of [
        ["level", registration.level, level],
        ["color", registration.color, color],
        ["sex", registration.sex, sex],
      ] as const) {
        if (!resolved)
          diagnostics.push({
            code: value.trim()
              ? "UNKNOWN_CONTROLLED_VALUE"
              : "MISSING_CONTROLLED_VALUE",
            message:
              "ยังไม่ได้กำหนดคำไทยและการเทียบค่าระดับ สี หรือเพศ กรุณาตรวจรายการก่อนดาวน์โหลด",
            path: field,
            value,
            registrationIds: [registration._id],
          });
      }
      continue;
    }
    const matches =
      bindings.get(
        tupleKey(registration.rawType, level.key, color.key, sex.key),
      ) ?? [];
    if (matches.length !== 1)
      diagnostics.push({
        code: matches.length
          ? "AMBIGUOUS_REGISTRATION"
          : "UNMAPPED_REGISTRATION",
        message: matches.length
          ? "ใบสมัครตรงกับหลายหมวดรุ่น กรุณาแก้การผูกข้อมูล"
          : "ยังไม่ได้ผูกใบสมัครเข้ากับรุ่นและกลุ่มส่งออก กรุณากำหนดให้ครบก่อนดาวน์โหลด",
        value: registration.rawType,
        registrationIds: [registration._id],
      });
    else matches[0]!.registrationIds.push(registration._id);
  }
  const names = allocateSheetNames(candidates, diagnostics);
  for (const [index, group] of groups.entries())
    group.sheetName = names[index]!;
  const populated = groups
    .filter((group) => group.registrationIds.length > 0)
    .map((group, index) => ({ ...group, ordinal: index + 1 }));
  return {
    ...base,
    state: diagnostics.length ? "needs-review" : "ready",
    layoutFingerprint: exportLayoutFingerprint(layout),
    groups: populated,
  };
}
