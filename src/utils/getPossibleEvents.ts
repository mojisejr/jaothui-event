export const getPossibleEvents = (age: number, data: string[]) => {
  if (data.length <= 0 || data == null) return [];
  const result = data
    .map((entry, index) => {
      const matches = entry.match(/(\d{1,2}) เดือน(?: ถึง (\d{1,2}) เดือน)?/);

      if (matches) {
        return {
          level: index,
          min: parseInt(matches[1] ?? "0", 10),
          max: matches[2] ? parseInt(matches[2], 10) : null,
        };
      }

      if (!matches) {
        return {
          level: index,
          min: 99,
          max: 99,
        };
      }
    })
    .filter((item) => item !== null && item != undefined);

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
