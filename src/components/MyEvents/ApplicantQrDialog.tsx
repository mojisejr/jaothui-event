import React, { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Liff } from "@line/liff";
import type { ApplicantApplication } from "~/server/services/competition-applicant-checkin";
import { api } from "~/utils/api";
import {
  applicantAuthorization,
  applicationLevelLabel,
  applicantRegistrationLabels,
  checkInTime,
} from "./applicant-history";

interface Props {
  application: ApplicantApplication;
  liff: Liff;
  onClose: () => void;
  onUpdated: () => void;
}

export function ApplicantQrDialog({
  application,
  liff,
  onClose,
  onUpdated,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [entry, setEntry] = useState(application);
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date>();
  const request = useRef(0);
  const pending = useRef(false);
  const qrAvailable = useRef(application.qrAvailable);
  const observedState = useRef(JSON.stringify(application));
  const { mutateAsync: issuePass } =
    api.registerEvent.applicantPass.useMutation();
  const { mutateAsync: readStatus } =
    api.registerEvent.ownedStatus.useMutation();
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;
  const invalidateRequests = useCallback(() => {
    request.current++;
    pending.current = false;
  }, []);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (element && !element.open) {
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
    }
    close.current?.focus();
    return () => {
      if (element?.open && typeof element.close === "function") element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  const refresh = useCallback(
    async (withQr = false) => {
      if (pending.current) return;
      if (!navigator.onLine) {
        setQrUrl("");
        setError(
          "ออฟไลน์ สถานะที่แสดงอาจยังไม่ใช่ข้อมูลล่าสุด กรุณาเชื่อมต่อแล้วโหลดใหม่",
        );
        setLoading(false);
        return;
      }
      const generation = ++request.current;
      pending.current = true;
      setLoading(true);
      try {
        const input = {
          ...applicantAuthorization(liff),
          registrationId: application._id,
        };
        let result =
          withQr && qrAvailable.current
            ? await issuePass(input)
            : await readStatus(input);
        if (generation !== request.current) return;
        if (withQr && !("application" in result) && result.qrAvailable) {
          result = await issuePass(input);
          if (generation !== request.current) return;
        }
        const next = "application" in result ? result.application : result;
        qrAvailable.current = next.qrAvailable;
        setEntry(next);
        if ("qrUrl" in result) setQrUrl(result.qrUrl);
        if (!next.qrAvailable) setQrUrl("");
        setError("");
        setUpdatedAt(new Date());
        const signature = JSON.stringify(next);
        if (observedState.current !== signature) {
          observedState.current = signature;
          onUpdatedRef.current();
        }
      } catch {
        if (generation === request.current) {
          setQrUrl("");
          setError(
            "โหลด QR หรือสถานะล่าสุดไม่สำเร็จ กรุณาลองใหม่ หรือเข้าสู่ระบบ LINE อีกครั้ง",
          );
        }
      } finally {
        if (generation === request.current) {
          pending.current = false;
          setLoading(false);
        }
      }
    },
    [application._id, liff, issuePass, readStatus],
  );

  useEffect(() => {
    void refresh(true);
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const offline = () => {
      setQrUrl("");
      setError(
        "ออฟไลน์ สถานะที่แสดงอาจยังไม่ใช่ข้อมูลล่าสุด กรุณาเชื่อมต่อแล้วโหลดใหม่",
      );
    };
    const timer = window.setInterval(visibleRefresh, 10000);
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

  return (
    <dialog
      ref={dialog}
      aria-labelledby="applicant-qr-title"
      aria-describedby="applicant-qr-instructions"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto bg-base-100 p-0 text-secondary backdrop:bg-black/75 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-md sm:rounded-2xl"
    >
      <div className="space-y-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="applicant-qr-title"
            className="text-xl font-semibold text-buffalo-gold"
          >
            QR รายงานตัว
          </h2>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            className="btn btn-ghost min-h-[44px] min-w-[44px]"
            aria-label="ปิด QR รายงานตัว"
          >
            ปิด
          </button>
        </div>
        <div className="space-y-1 break-words">
          <p className="text-xl font-semibold">{entry.name}</p>
          <p>{entry.event.title}</p>
          <p className="font-semibold text-buffalo-gold">{entry.type}</p>
          {entry.level ? (
            <p className="text-sm">{applicationLevelLabel(entry.level)}</p>
          ) : null}
          <p className="font-mono text-base">ไมโครชิป {entry.microchip}</p>
        </div>
        <p
          id="applicant-qr-instructions"
          className="text-sm text-buffalo-cream"
        >
          ยื่น QR นี้ให้เจ้าหน้าที่สแกนและยืนยันรายงานตัว
          สำหรับรุ่นที่แสดงด้านบนเท่านั้น
        </p>
        {qrUrl ? (
          <div className="mx-auto max-w-[280px] rounded-xl bg-white p-3">
            <QRCodeSVG
              value={qrUrl}
              size={256}
              level="M"
              marginSize={4}
              title={`QR รายงานตัว ${entry.name} รุ่น ${entry.type}`}
              className="h-auto w-full"
            />
          </div>
        ) : loading ? (
          <p role="status">กำลังเตรียมข้อมูล…</p>
        ) : null}
        <div
          aria-live="polite"
          className="space-y-2 rounded-xl border border-buffalo-cream/20 p-4"
        >
          <p className="text-sm">
            ใบสมัคร: {applicantRegistrationLabels[entry.registrationStatus]}
          </p>
          <p
            className={`text-lg font-semibold ${entry.checkInStatus === "checked_in" ? "text-green-300" : "text-secondary"}`}
          >
            {entry.checkInStatus === "checked_in"
              ? "รายงานตัวแล้ว"
              : "ยังไม่รายงานตัว"}
          </p>
          {entry.checkedInAt ? (
            <p className="text-sm">
              {checkInTime(entry.checkedInAt)} (เวลาไทย)
            </p>
          ) : null}
          {!entry.checkInEligibility.eligible &&
          entry.checkInEligibility.reason ? (
            <p className="text-sm">{entry.checkInEligibility.reason}</p>
          ) : null}
        </div>
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-orange-300/30 bg-orange-400/10 p-3 text-sm text-orange-100"
          >
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void refresh(!qrUrl)}
          disabled={loading}
          className="btn btn-outline btn-secondary min-h-[44px] w-full"
        >
          {loading ? "กำลังโหลด…" : "โหลดข้อมูลล่าสุด"}
        </button>
        {updatedAt ? (
          <p className="text-center text-sm text-buffalo-cream">
            ข้อมูลล่าสุด {checkInTime(updatedAt.toISOString())}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
