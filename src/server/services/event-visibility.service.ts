import type { Event } from "~/interfaces/Event";
import {
  getCompetitionPolicy,
  type CompetitionPolicyEvent,
} from "./competition-policy";
export function isAdminVisibleEvent(
  event: CompetitionPolicyEvent,
  now: Date = new Date(),
): boolean {
  return getCompetitionPolicy(event, now).onsiteAllowed;
}
export function filterAdminActiveEvents(
  events: Event[],
  now: Date = new Date(),
): Event[] {
  return events.filter((event) => isAdminVisibleEvent(event, now));
}
