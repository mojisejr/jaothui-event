import {
  classDisplayName,
  isCompetitionClassEligible,
  parseCompetitionClass,
} from "~/lib/competition-classes";
export type AgeRange = {
  level: number;
  min: number;
  max: number | null;
  original: string;
};
/** Legacy API retained; only actual age rules can participate in automatic assignment. */
export const parseAgeRanges = (data: string[]): AgeRange[] =>
  (data ?? []).flatMap((entry, level) => {
    const rule = parseCompetitionClass(entry);
    if (!rule || rule.kind !== "age") return [];
    return [
      {
        level,
        min:
          rule.minMonths === null
            ? 0
            : rule.minMonths + (rule.minInclusive ? 0 : 1),
        max: rule.maxMonths,
        original: classDisplayName(entry),
      },
    ];
  });
export const findExactAgeMatch = (
  age: number,
  ranges: AgeRange[],
): AgeRange | null =>
  ranges.find(
    (r) =>
      Number.isFinite(age) && r.min <= age && (r.max === null || age <= r.max),
  ) ?? null;
export const getPossibleEvents = (age: number, data: string[]): string[] => [
  ...new Set(
    (data ?? [])
      .filter(
        (value) =>
          parseCompetitionClass(value)?.kind === "age" &&
          isCompetitionClassEligible(age, value),
      )
      .map(classDisplayName),
  ),
];
/** With no age, only unbounded manual classes are returned. */
export const getSpecialEvents = (data: string[], age?: number): string[] => [
  ...new Set(
    (data ?? [])
      .filter((value) => {
        const rule = parseCompetitionClass(value);
        return (
          rule?.kind === "special" &&
          (age === undefined
            ? rule.minMonths === null && rule.maxMonths === null
            : isCompetitionClassEligible(age, value))
        );
      })
      .map(classDisplayName),
  ),
];
