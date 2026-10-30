import { useCallback, useEffect, useRef, useState } from "react";
import type { Liff } from "@line/liff";
import type { ApplicantApplication } from "~/server/services/competition-applicant-checkin";
import { api } from "~/utils/api";
import { applicantAuthorization } from "./applicant-history";

/** Authenticated POST reads deliberately avoid query keys/URLs containing LINE credentials. */
export function useApplicantHistory(liff: Liff | undefined, userId?: string) {
  const { mutateAsync } = api.registerEvent.ownedHistory.useMutation();
  const [events, setEvents] = useState<ApplicantApplication[] | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const request = useRef(0);
  const pending = useRef(false);
  const invalidateRequests = useCallback(() => {
    request.current++;
    pending.current = false;
  }, []);
  const refresh = useCallback(async () => {
    if (!userId || !liff || pending.current) return;
    if (!navigator.onLine) {
      setError(
        "ออฟไลน์ ข้อมูลที่แสดงอาจยังไม่ใช่ข้อมูลล่าสุด กรุณาเชื่อมต่อแล้วโหลดใหม่",
      );
      return;
    }
    const generation = ++request.current;
    pending.current = true;
    setLoading(true);
    try {
      const next = await mutateAsync(applicantAuthorization(liff));
      if (generation !== request.current) return;
      setEvents(next);
      setUpdatedAt(new Date());
      setError("");
    } catch {
      if (generation === request.current)
        setError(
          "โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาลองใหม่ หรือเข้าสู่ระบบ LINE อีกครั้ง",
        );
    } finally {
      if (generation === request.current) {
        setLoading(false);
        pending.current = false;
      }
    }
  }, [liff, userId, mutateAsync]);

  useEffect(() => {
    invalidateRequests();
    setEvents(undefined);
    setUpdatedAt(undefined);
    setError("");
    void refresh();
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const offline = () =>
      setError(
        "ออฟไลน์ ข้อมูลที่แสดงอาจยังไม่ใช่ข้อมูลล่าสุด กรุณาเชื่อมต่อแล้วโหลดใหม่",
      );
    const timer = window.setInterval(visibleRefresh, 30000);
    window.addEventListener("focus", visibleRefresh);
    window.addEventListener("online", visibleRefresh);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      invalidateRequests();
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      window.removeEventListener("online", visibleRefresh);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [refresh, invalidateRequests]);

  return { events, error, loading, updatedAt, refresh };
}
