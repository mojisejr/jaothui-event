import React, { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import {
  dismissPushInvitation,
  invitationDismissed,
  PUSH_PUBLIC_CONFIG_URL,
  PUSH_SETTINGS_URL,
} from "~/lib/push-invitation";

/** A link-only invitation: notification permission belongs to the canonical WWW origin. */
export function PushInvitation({
  ownerKey,
  eligible,
}: {
  ownerKey?: string;
  eligible: boolean;
}) {
  const [visibleOwner, setVisibleOwner] = useState<string>();
  useEffect(() => {
    setVisibleOwner(undefined);
    if (!ownerKey || !eligible || invitationDismissed(ownerKey)) return;
    let alive = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    void (async () => {
      try {
        const response = await fetch(PUSH_PUBLIC_CONFIG_URL, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          ok?: boolean;
          data?: { available?: boolean; vapidPublicKey?: unknown };
        };
        if (
          alive &&
          response.ok &&
          body.ok === true &&
          body.data?.available === true &&
          typeof body.data.vapidPublicKey === "string" &&
          body.data.vapidPublicKey.length > 0
        )
          setVisibleOwner(invitationDismissed(ownerKey) ? undefined : ownerKey);
      } catch {
        /* Unavailable config must not disturb registration or owned history. */
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      alive = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [ownerKey, eligible]);
  if (visibleOwner !== ownerKey || !ownerKey || !eligible) return null;
  const dismiss = () => {
    dismissPushInvitation(ownerKey);
    setVisibleOwner(undefined);
  };
  return (
    <section
      aria-label="เปิดแจ้งเตือนการแข่งขัน"
      className="my-5 w-full max-w-md rounded-2xl border border-primary/25 bg-base-200 p-5 text-left text-secondary"
    >
      <div className="mb-2 flex items-center gap-2 text-primary">
        <FiBell aria-hidden="true" className="h-5 w-5" />
        <h2 className="text-lg font-semibold">ไม่พลาดวันประกวด</h2>
      </div>
      <p className="text-sm leading-relaxed">
        รับแจ้งเตือนก่อนวันงาน 1 วัน เวลา 09:00 น. สำหรับใบสมัครที่เข้าเกณฑ์
      </p>
      <p className="mt-2 text-sm leading-relaxed text-secondary/75">
        ไปที่เว็บไซต์เจ้าทุย
        จากนั้นกดเปิดและอนุญาตการแจ้งเตือนบนอุปกรณ์นี้อีกครั้ง
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={PUSH_SETTINGS_URL}
          onClick={dismiss}
          className="btn btn-primary h-auto min-h-[44px] whitespace-normal py-3"
        >
          เปิดแจ้งเตือนบนเว็บไซต์เจ้าทุย
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="btn btn-ghost min-h-[44px]"
        >
          ไว้ภายหลัง
        </button>
      </div>
    </section>
  );
}
