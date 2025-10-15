export type AgeRange = {
  level: number;
  min: number;
  max: number | null;
  original: string;
};

export const parseAgeRanges = (data: string[]): AgeRange[] => {
  if (data.length <= 0 || data == null) return [];
  
  return data
    .map((entry, index) => {
      const matches = entry.match(/(\d{1,2}) เดือน(?: ถึง (\d{1,2}) เดือน)?/);

      if (matches) {
        return {
          level: index,
          min: parseInt(matches[1] ?? "0", 10),
          max: matches[2] ? parseInt(matches[2], 10) : null,
          original: entry,
        };
      }

      // If no matches, return a range that won't match any age
      return {
        level: index,
        min: 99,
        max: 99,
        original: entry,
      };
    })
    .filter((item) => item !== null && item != undefined);
};

export const findExactAgeMatch = (age: number, ranges: AgeRange[]): AgeRange | null => {
  // Find exact match where age falls within the range
  const exactMatch = ranges.find(
    (r) => r.min <= age && (r.max === null || age <= r.max)
  );
  
  return exactMatch ?? null;
};

export const getPossibleEvents = (age: number, data: string[]) => {
  if (data.length <= 0 || data == null) return [];
  const result = parseAgeRanges(data);

  // Get the range where age falls in OR where age is greater than max
  const d = result.filter(
    (r) =>
      (r.min <= age && (r.max === null || age <= r.max)) ||
      (r.max !== null && age <= r.min),
  );

  const event = d.map((e) => {
    return data[e.level];
  });
  return event;
};
