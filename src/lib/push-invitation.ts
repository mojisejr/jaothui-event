export const PUSH_SETTINGS_URL =
  "https://www.jaothui.com/v2/profile#competition-notifications";
export const PUSH_PUBLIC_CONFIG_URL =
  "https://www.jaothui.com/api/notifications/config";
const COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const KEY = "jaothui.push.invitation.v1";
const MAX_ACCOUNTS = 8;
type Dismissal = { owner: string; at: number };
let dismissedInSession: Dismissal[] = [];
function recent(items: Dismissal[], now: number) {
  const merged = new Map<string, Dismissal>();
  for (const item of items) {
    if (
      typeof item?.owner !== "string" ||
      !item.owner ||
      item.owner.length > 300 ||
      !Number.isFinite(item.at) ||
      now - item.at >= COOLDOWN
    )
      continue;
    if (!merged.has(item.owner) || merged.get(item.owner)!.at < item.at)
      merged.set(item.owner, item);
  }
  return [...merged.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ACCOUNTS);
}
function stored() {
  const raw = localStorage.getItem(KEY);
  if (raw && raw.length > 8192) throw new Error("Invalid dismissal state");
  const value: unknown = JSON.parse(raw ?? "[]");
  if (!Array.isArray(value)) throw new Error("Invalid dismissal state");
  return value as Dismissal[];
}

/** Event knows only this invitation's dismissal, never WWW permission or subscription status. */
export function invitationDismissed(owner: string, now = Date.now()) {
  try {
    dismissedInSession = recent([...stored(), ...dismissedInSession], now);
    return dismissedInSession.some((item) => item.owner === owner);
  } catch {
    return true;
  }
}

export function dismissPushInvitation(owner: string, now = Date.now()) {
  dismissedInSession = recent([{ owner, at: now }, ...dismissedInSession], now);
  try {
    dismissedInSession = recent([...stored(), ...dismissedInSession], now);
    localStorage.setItem(KEY, JSON.stringify(dismissedInSession));
  } catch {
    /* Current SPA still respects dismissal without persistent storage. */
  }
}
