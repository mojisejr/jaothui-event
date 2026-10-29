import { createHash } from "node:crypto";
import { type SanityClient } from "next-sanity";
import { CompetitionAdminError } from "./competition-contract";

type Doc = Record<string, any> & { _id: string; _rev: string; _type: string };
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const error = (status: number, code: string, message: string): never => {
  throw new CompetitionAdminError(status, code, message);
};
/** Documents that exist only to describe one registration and are archived with it. */
const DEPENDENT_TYPES = ["approvment", "eventImage", "eventAddress"];

export const operationDocumentId = (operationId: string) =>
  `competition-operation-${operationId}`;
/** Returns the recorded operation for a replay; a reused id with other data is refused. */
export async function findOperation(
  db: SanityClient,
  operationId: string,
  payload: unknown,
): Promise<Doc | null> {
  const doc = await db.getDocument<Doc>(operationDocumentId(operationId));
  if (!doc) return null;
  if (doc.payloadHash !== hash(payload))
    return error(
      409,
      "OPERATION_REUSED",
      "รหัสการดำเนินการนี้ถูกใช้กับข้อมูลอื่นแล้ว",
    );
  return doc;
}
export function operationDocument(
  operationId: string,
  eventId: string,
  payload: unknown,
  action: string,
) {
  return {
    _id: operationDocumentId(operationId),
    _type: "competitionAdminOperation",
    eventId,
    payloadHash: hash(payload),
    action,
    actor: "dashboard-shared",
    createdAt: new Date().toISOString(),
  };
}
async function strongEvent(db: SanityClient, id: string, revision: string) {
  const event = await db.getDocument<Doc>(id);
  if (event?._type !== "event")
    return error(404, "NOT_FOUND", "ไม่พบงานแข่งขัน");
  if (event._rev !== revision)
    return error(
      409,
      "REVISION_CONFLICT",
      "ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด",
    );
  return event;
}
const counterOf = (event: Doc) =>
  typeof event.competitionRegistrationCount === "number"
    ? event.competitionRegistrationCount
    : null;

export type DeleteApplicationResult = {
  registrationId: string;
  previousCount: number | null;
  registrationCount: number;
};
/**
 * Removes one registration with its approval/image/address documents and lowers
 * the event counter in a single fenced transaction. The operation document keeps
 * every removed document verbatim (as JSON, so no references keep them alive).
 */
export async function deleteApplication(
  db: SanityClient,
  id: string,
  registrationId: string,
  operationId: string,
  revision: string,
  registrationRevision: string,
  reason: string,
): Promise<DeleteApplicationResult> {
  const payload = {
    action: "delete-application",
    id,
    registrationId,
    revision,
    registrationRevision,
    reason,
  };
  const previous = await findOperation(db, operationId, payload);
  if (previous) return previous.result as DeleteApplicationResult;
  const event = await strongEvent(db, id, revision);
  const registration = await db.getDocument<Doc>(registrationId);
  if (
    registration?._type !== "eventRegister" ||
    registration.event?._ref !== id
  )
    return error(404, "APPLICATION_NOT_FOUND", "ไม่พบใบสมัครในงานนี้");
  if (registration._rev !== registrationRevision)
    return error(409, "REVISION_CONFLICT", "ใบสมัครเปลี่ยนแล้ว กรุณาโหลดใหม่");
  const dependents = await db.fetch<Doc[]>("*[references($registrationId)]", {
    registrationId,
  });
  const removed = [registrationId, ...dependents.map((d) => d._id)];
  const outside = [
    ...dependents.filter((d) => !DEPENDENT_TYPES.includes(d._type)),
    ...(dependents.length
      ? await db.fetch<Doc[]>("*[references($ids) && !(_id in $removed)]", {
          ids: dependents.map((d) => d._id),
          removed,
        })
      : []),
  ];
  if (outside.length)
    return error(
      409,
      "REFERENCED_DOCUMENTS",
      "ใบสมัครนี้ยังถูกใช้โดยข้อมูลอื่น จึงลบอัตโนมัติไม่ได้ กรุณาติดต่อผู้ดูแลระบบ",
    );
  const previousCount = counterOf(event);
  const result: DeleteApplicationResult = {
    registrationId,
    previousCount,
    registrationCount: Math.max(0, (previousCount ?? 0) - 1),
  };
  let tx = db
    .transaction()
    .patch(id, (p) =>
      p
        .ifRevisionId(revision)
        .set({ competitionRegistrationCount: result.registrationCount })
        .setIfMissing({ competitionWriteFence: 0 })
        .inc({ competitionWriteFence: 1 }),
    )
    // Fences the registration itself; the same transaction removes it below.
    .patch(registrationId, (p) =>
      p
        .ifRevisionId(registrationRevision)
        .set({ competitionDeleteOperationId: operationId }),
    );
  for (const dependent of dependents) tx = tx.delete(dependent._id);
  await tx
    .delete(registrationId)
    .create({
      ...operationDocument(operationId, id, payload, "delete-application"),
      reason,
      registrationId,
      archivedDocuments: JSON.stringify([registration, ...dependents]),
      result,
    })
    .commit({ visibility: "sync" });
  return result;
}

export type RecountResult = {
  previousCount: number | null;
  registrationCount: number;
  changed: boolean;
};
/** Sets the counter to the indexed registrations, only when the index has caught up with the event. */
export async function recountRegistrations(
  db: SanityClient,
  id: string,
  operationId: string,
  revision: string,
): Promise<RecountResult> {
  const payload = { action: "recount-registrations", id, revision };
  const previous = await findOperation(db, operationId, payload);
  if (previous) return previous.result as RecountResult;
  const event = await strongEvent(db, id, revision);
  // Revision and count come from one query, so they describe the same index state.
  const indexed = await db.fetch<{
    _rev: string;
    registrationCount: number;
  } | null>(
    '*[_type=="event" && _id==$id][0]{_rev,"registrationCount":count(*[_type=="eventRegister" && event._ref==$id])}',
    { id },
  );
  if (indexed?._rev !== event._rev)
    return error(
      409,
      "REGISTRATION_INDEX_PENDING",
      "ข้อมูลผู้สมัครกำลังอัปเดต กรุณาลองตรวจนับอีกครั้ง",
    );
  const previousCount = counterOf(event);
  const result: RecountResult = {
    previousCount,
    registrationCount: indexed.registrationCount,
    changed: previousCount !== indexed.registrationCount,
  };
  if (!result.changed) return result;
  await db
    .transaction()
    .patch(id, (p) =>
      p
        .ifRevisionId(revision)
        .set({ competitionRegistrationCount: result.registrationCount })
        .setIfMissing({ competitionWriteFence: 0 })
        .inc({ competitionWriteFence: 1 }),
    )
    .create({
      ...operationDocument(operationId, id, payload, "recount-registrations"),
      result,
    })
    .commit({ visibility: "sync" });
  return result;
}
