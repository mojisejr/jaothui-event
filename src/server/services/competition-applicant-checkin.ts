import { type SanityClient } from "next-sanity";
import { TRPCError } from "@trpc/server";
import { client } from "~/server/sanity/client";
import { CompetitionAdminError } from "~/server/admin/competition-contract";
import {
  checkInContext,
  type CheckInDocument,
} from "~/server/admin/competition-checkin";
import { checkInEligibility, checkInState } from "./competition-checkin-policy";
import { registrationPolicy } from "./competition-approval-policy";
import { verifyApplicantAuthorization } from "./line-auth.service";
import { issueCheckInToken } from "./competition-checkin-token";

export type ApplicantAuthorization = {
  idToken?: string;
  lineAccessToken?: string;
};
export type ApplicantApplication = ReturnType<typeof applicantApplication>;
const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Explicit allowlist: never spread an admin application into an applicant response. */
export function applicantApplication(
  registration: CheckInDocument,
  event: CheckInDocument,
  approval?: CheckInDocument | null,
) {
  return {
    _id: registration._id,
    _rev: registration._rev,
    _createdAt: text(registration._createdAt),
    name: text(registration.name),
    microchip: text(registration.microchip),
    type: text(registration.type),
    level: text(registration.level),
    ownerName: text(registration.ownerName),
    farmName: text(registration.farmName),
    birthday: text(registration.birthday),
    sex: text(registration.sex ?? registration.gender),
    color: text(registration.color),
    buffaloAge:
      typeof registration.buffaloAge === "number" &&
      Number.isFinite(registration.buffaloAge) &&
      registration.buffaloAge >= 0
        ? registration.buffaloAge
        : null,
    event: {
      _id: event._id,
      title: text(event.title),
      startAt: text(event.startAt ?? event.eventAt),
      endAt: text(event.endAt),
      eventType:
        typeof event.eventType === "string" ? event.eventType : undefined,
    },
    ...registrationPolicy(event, approval),
    approvementResult:
      typeof approval?.approvementResult === "boolean"
        ? (approval.approvementResult as boolean)
        : null,
    comment: text(approval?.comment) || null,
    ...checkInState(registration),
    ...checkInEligibility(event, approval),
  };
}

/** Owned reads use POST bodies at the router, never put LINE credentials in URL query input. */
export class CompetitionApplicantCheckInService {
  constructor(private db: SanityClient = client) {}

  async history(auth: ApplicantAuthorization): Promise<ApplicantApplication[]> {
    return this.historyForOwner(await verifyApplicantAuthorization(auth));
  }

  /** Server-only internals: callers must authenticate before deriving this owner. */
  async historyForOwner(owner: string): Promise<ApplicantApplication[]> {
    const rows = await this.db.fetch<CheckInDocument[]>(
      '*[_type=="eventRegister" && user._ref==$owner && event->competitionState != "draft" && !(event._ref in path("drafts.**"))] | order(_createdAt desc,_id desc){_id,_rev,_createdAt,name,microchip,type,level,ownerName,farmName,birthday,sex,gender,color,buffaloAge,checkInStatus,checkedInAt,checkedInBy,"event":event->{_id,_rev,title,startAt,eventAt,endAt,eventType,competitionState,isActive},"approval":*[_type=="approvment" && eventRegister._ref==^._id && event._ref==^.event._ref] | order(coalesce(approvementDate,_updatedAt,_createdAt) desc,_id desc)[0]{approvementResult,comment}}',
      { owner },
    );
    // Past entries remain available for the page's existing all/past filters; no date truncation here.
    return rows
      .filter((row) => row.event?._id)
      .map((row) => applicantApplication(row, row.event, row.approval));
  }

  async historyPageForOwner(
    owner: string,
    input: {
      limit: number;
      period: "active" | "past" | "all";
      q: string;
      cursor?: string;
    },
  ) {
    let stamp = "9999",
      id = "~";
    if (input.cursor) {
      try {
        const pair: unknown = JSON.parse(
          Buffer.from(input.cursor, "base64url").toString(),
        );
        if (
          !Array.isArray(pair) ||
          pair.length !== 2 ||
          typeof pair[0] !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T/.test(pair[0]) ||
          !Number.isFinite(Date.parse(pair[0])) ||
          typeof pair[1] !== "string" ||
          !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,199}$/.test(pair[1])
        )
          throw new Error();
        [stamp, id] = pair as [string, string];
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ตัวแบ่งหน้าไม่ถูกต้อง",
        });
      }
    }
    const base =
      '*[_type=="eventRegister" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && user._ref==$owner && defined(event->_id) && coalesce(event->competitionState,"published")!="draft" && !(event._ref in path("drafts.**")) && !(event._ref in path("versions.**"))';
    const projection =
      '{_id,_rev,_createdAt,name,microchip,type,level,ownerName,farmName,birthday,sex,gender,color,buffaloAge,checkInStatus,checkedInAt,checkedInBy,"event":event->{_id,_rev,title,startAt,eventAt,endAt,eventType,competitionState,isActive},"approval":*[_type=="approvment" && eventRegister._ref==^._id && event._ref==^.event._ref] | order(coalesce(approvementDate,_updatedAt,_createdAt) desc,_id desc)[0]{approvementResult,comment}}';
    const rows = await this.db.fetch<CheckInDocument[]>(
      base +
        ' && ($period=="all" || ($period=="active" && event->endAt >= $today) || ($period=="past" && event->endAt < $today)) && ($q=="" || event->title==$q) && (_createdAt<$stamp || (_createdAt==$stamp && _id<$id))] | order(_createdAt desc,_id desc)[0...$take]' +
        projection,
      {
        owner,
        period: input.period,
        q: input.q,
        stamp,
        id,
        take: input.limit + 1,
        today: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10),
      },
    );
    const names = await this.db.fetch<string[]>(
      "array::unique(" + base + "].event->title)",
      { owner },
    );
    const items = rows.slice(0, input.limit),
      last = items[items.length - 1];
    return {
      items: items.map((row) =>
        applicantApplication(row, row.event, row.approval),
      ),
      eventNames: names
        .filter((name): name is string => typeof name === "string")
        .sort(),
      nextCursor:
        rows.length > items.length && last
          ? Buffer.from(JSON.stringify([last._createdAt, last._id])).toString(
              "base64url",
            )
          : null,
    };
  }

  private async owned(owner: string, registrationId: string) {
    if (/^(drafts|versions)\./.test(registrationId))
      throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบใบสมัครของคุณ" });
    const registration =
      await this.db.getDocument<CheckInDocument>(registrationId);
    if (
      registration?._type !== "eventRegister" ||
      registration.user?._ref !== owner ||
      typeof registration.event?._ref !== "string"
    )
      throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบใบสมัครของคุณ" });
    const context = await checkInContext(
      this.db,
      registration.event._ref,
      registrationId,
    );
    // Ownership itself is strong-read again inside the context; never rely on a stale pre-read.
    if (context.registration.user?._ref !== owner)
      throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบใบสมัครของคุณ" });
    if (
      context.event.competitionState === "draft" ||
      context.event._id.startsWith("drafts.")
    )
      throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบใบสมัครของคุณ" });
    return context;
  }

  async status(auth: ApplicantAuthorization, registrationId: string) {
    return this.statusForOwner(
      await verifyApplicantAuthorization(auth),
      registrationId,
    );
  }

  async statusForOwner(owner: string, registrationId: string) {
    const { event, registration, approval } = await this.owned(
      owner,
      registrationId,
    );
    return applicantApplication(registration, event, approval);
  }

  async pass(auth: ApplicantAuthorization, registrationId: string) {
    return this.passForOwner(
      await verifyApplicantAuthorization(auth),
      registrationId,
    );
  }

  async passForOwner(owner: string, registrationId: string) {
    const context = await this.owned(owner, registrationId);
    const application = applicantApplication(
      context.registration,
      context.event,
      context.approval,
    );
    if (!application.qrAvailable)
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          application.checkInEligibility.reason ??
          "ใบสมัครนี้ยังไม่พร้อมแสดง QR",
      });
    const qrUrl = await issueCheckInToken(
      this.db,
      context.event._id,
      context.registration,
    );
    // Issuance may add the registration's initial token generation and advance its revision.
    const freshContext = await checkInContext(
      this.db,
      context.event._id,
      registrationId,
    );
    if (
      freshContext.registration.user?._ref !== context.registration.user?._ref
    )
      throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบใบสมัครของคุณ" });
    const freshApplication = applicantApplication(
      freshContext.registration,
      freshContext.event,
      freshContext.approval,
    );
    if (!freshApplication.qrAvailable)
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          freshApplication.checkInEligibility.reason ??
          "ใบสมัครนี้ยังไม่พร้อมแสดง QR",
      });
    return { application: freshApplication, qrUrl };
  }
}

export function applicantCheckInError(cause: unknown): never {
  if (cause instanceof TRPCError) throw cause;
  if (cause instanceof CompetitionAdminError) {
    const code =
      cause.status === 404
        ? "NOT_FOUND"
        : cause.status === 409
          ? "CONFLICT"
          : cause.status === 503
            ? "INTERNAL_SERVER_ERROR"
            : "BAD_REQUEST";
    throw new TRPCError({ code, message: cause.message });
  }
  if ((cause as { statusCode?: number })?.statusCode === 409)
    throw new TRPCError({
      code: "CONFLICT",
      message: "ข้อมูลเปลี่ยนแล้ว กรุณาโหลดใหม่",
    });
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "โหลดข้อมูลรายงานตัวไม่สำเร็จ กรุณาลองใหม่",
  });
}
