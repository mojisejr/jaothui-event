import dayjs from "dayjs";
import { ProfileStats } from "~/interfaces/ProfileStats";

export type ProfileStatsRegister = {
  _id: string;
  event?: {
    _id?: string;
    endAt?: string;
    isActive?: boolean;
  } | null;
};

export function calculateProfileStats(
  registers: ProfileStatsRegister[],
  now: Date = new Date(),
): ProfileStats {
  const nowDate = dayjs(now);
  const activeRegisters = registers.filter((register) => {
    const event = register.event;
    if (!event) return false;
    if (event.isActive === false) return false;
    if (!event.endAt) return false;

    const endAt = dayjs(event.endAt);
    if (!endAt.isValid()) return false;

    return nowDate.isBefore(endAt) || nowDate.isSame(endAt, "day");
  });

  const uniqueEvents = new Set(
    activeRegisters
      .map((register) => register.event?._id)
      .filter((eventId): eventId is string => Boolean(eventId)),
  );

  return {
    activeBuffaloCount: activeRegisters.length,
    activeEventCount: uniqueEvents.size,
    evaluatedRegisterCount: registers.length,
  };
}
