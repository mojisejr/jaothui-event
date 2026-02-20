import type { Event } from "~/interfaces/Event";

export const ADMIN_EVENT_END_GRACE_DAYS = 1;

export function isAdminVisibleEvent(
  event: Pick<Event, "isActive" | "endAt">,
  now: Date = new Date(),
): boolean {
  if (event.isActive === false) return false;

  if (!event.endAt) return true;

  const endAt = new Date(event.endAt);
  if (Number.isNaN(endAt.getTime())) return false;

  const endAtWithGrace = new Date(endAt);
  endAtWithGrace.setDate(endAtWithGrace.getDate() + ADMIN_EVENT_END_GRACE_DAYS);

  return now <= endAtWithGrace;
}

export function filterAdminActiveEvents(
  events: Event[],
  now: Date = new Date(),
): Event[] {
  return events.filter((event) => isAdminVisibleEvent(event, now));
}
