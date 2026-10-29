import { describe, expect, it } from "vitest";
import { type SanityClient } from "next-sanity";
import {
  deleteApplication,
  recountRegistrations,
} from "~/server/admin/competition-registration-admin";

type Document = Record<string, any> & { _id: string; _rev: string };
const EVENT = "competition-event";
const OP = "11111111-1111-4111-8111-111111111111";
const REASON = "ทดสอบระบบ ลบใบสมัครที่ไม่ใช่ของจริง";

function memory(seed: Document[], options: { lagRevision?: boolean } = {}) {
  const docs = new Map(seed.map((d) => [d._id, d]));
  let version = 0;
  const refersTo = (doc: Document, ids: string[]) =>
    JSON.stringify(doc)
      .match(/"_ref":"([^"]+)"/g)
      ?.some((m) => ids.includes(m.slice(8, -1))) ?? false;
  const db = {
    getDocument: async (id: string) => docs.get(id),
    fetch: async (query: string, params: any) => {
      if (query === "*[references($registrationId)]")
        return [...docs.values()].filter((d) =>
          refersTo(d, [params.registrationId]),
        );
      if (query.startsWith("*[references($ids)"))
        return [...docs.values()].filter(
          (d) => refersTo(d, params.ids) && !params.removed.includes(d._id),
        );
      if (query.startsWith('*[_type=="event" && _id==$id][0]{_rev'))
        return {
          _rev: options.lagRevision ? "older" : docs.get(params.id)?._rev,
          registrationCount: [...docs.values()].filter(
            (d) => d._type === "eventRegister" && d.event?._ref === params.id,
          ).length,
        };
      throw Error(query);
    },
    transaction: () => {
      const operations: ((next: Map<string, Document>) => void)[] = [];
      const tx = {
        create: (doc: any) => {
          operations.push((next) => {
            if (next.has(doc._id))
              throw Object.assign(Error("exists"), { statusCode: 409 });
            next.set(doc._id, { ...doc, _rev: `v${++version}` });
          });
          return tx;
        },
        delete: (id: string) => {
          operations.push((next) => {
            next.delete(id);
          });
          return tx;
        },
        patch: (id: string, builder: any) => {
          let revision: string | undefined;
          let set: Record<string, any> = {};
          let inc: Record<string, number> = {};
          let defaults: Record<string, any> = {};
          const p = {
            ifRevisionId: (rev: string) => ((revision = rev), p),
            set: (values: any) => ((set = values), p),
            inc: (values: any) => ((inc = values), p),
            setIfMissing: (values: any) => ((defaults = values), p),
          };
          builder(p);
          operations.push((next) => {
            const doc = next.get(id);
            if (!doc || (revision && doc._rev !== revision))
              throw Object.assign(Error("revision"), { statusCode: 409 });
            const changed: Document = {
              ...defaults,
              ...doc,
              ...set,
              _rev: `v${++version}`,
            };
            for (const [k, n] of Object.entries(inc)) changed[k] += n;
            next.set(id, changed);
          });
          return tx;
        },
        commit: async () => {
          const next = new Map(docs);
          for (const op of operations) op(next);
          // Mirrors Sanity: a commit leaving a dangling strong reference fails entirely.
          for (const doc of next.values())
            if (
              JSON.stringify(doc)
                .match(/"_ref":"([^"]+)"/g)
                ?.some((m) => !next.has(m.slice(8, -1)))
            )
              throw Object.assign(Error("reference"), { statusCode: 409 });
          docs.clear();
          for (const [k, v] of next) docs.set(k, v);
          return {};
        },
      };
      return tx;
    },
  };
  return { docs, db: db as unknown as SanityClient };
}
const ref = (id: string) => ({ _type: "reference", _ref: id });
const event = (counter?: number): Document => ({
  _id: EVENT,
  _rev: "event-rev",
  _type: "event",
  ...(counter === undefined ? {} : { competitionRegistrationCount: counter }),
});
const entry = (id = "entry"): Document => ({
  _id: id,
  _rev: `${id}-rev`,
  _type: "eventRegister",
  event: ref(EVENT),
  name: "ควายทดสอบ",
});
const dependents = (): Document[] => [
  {
    _id: "approval",
    _rev: "a",
    _type: "approvment",
    event: ref(EVENT),
    eventRegister: ref("entry"),
    eventImage: ref("image"),
  },
  {
    _id: "image",
    _rev: "i",
    _type: "eventImage",
    event: ref(EVENT),
    eventRegister: ref("entry"),
  },
  {
    _id: "address",
    _rev: "d",
    _type: "eventAddress",
    event: ref(EVENT),
    eventRegister: ref("entry"),
  },
];
const remove = (
  m: ReturnType<typeof memory>,
  overrides: Partial<{
    revision: string;
    registrationRevision: string;
    registrationId: string;
    operationId: string;
  }> = {},
) =>
  deleteApplication(
    m.db,
    EVENT,
    overrides.registrationId ?? "entry",
    overrides.operationId ?? OP,
    overrides.revision ?? "event-rev",
    overrides.registrationRevision ?? "entry-rev",
    REASON,
  );

describe("delete application", () => {
  it("removes the entry and its documents, lowers the counter and archives everything in one commit", async () => {
    const m = memory([event(2), entry(), entry("other"), ...dependents()]);
    await expect(remove(m)).resolves.toEqual({
      registrationId: "entry",
      previousCount: 2,
      registrationCount: 1,
    });
    for (const id of ["entry", "approval", "image", "address"])
      expect(m.docs.has(id)).toBe(false);
    expect(m.docs.has("other")).toBe(true);
    const updated = m.docs.get(EVENT)!;
    expect(updated.competitionRegistrationCount).toBe(1);
    expect(updated.competitionWriteFence).toBe(1);
    const operation = m.docs.get(`competition-operation-${OP}`)!;
    expect(operation).toMatchObject({
      action: "delete-application",
      reason: REASON,
      registrationId: "entry",
      eventId: EVENT,
    });
    const archived = JSON.parse(operation.archivedDocuments as string);
    expect(archived.map((d: Document) => d._id).sort()).toEqual([
      "address",
      "approval",
      "entry",
      "image",
    ]);
    expect(archived.find((d: Document) => d._id === "entry").name).toBe(
      "ควายทดสอบ",
    );
  });
  it("replays the same operation without deleting or decrementing again", async () => {
    const m = memory([event(2), entry(), entry("other")]);
    const first = await remove(m);
    await expect(remove(m)).resolves.toEqual(first);
    expect(m.docs.get(EVENT)!.competitionRegistrationCount).toBe(1);
    expect(m.docs.has("other")).toBe(true);
  });
  it("refuses an operation id reused for another entry", async () => {
    const m = memory([event(2), entry(), entry("other")]);
    await remove(m);
    await expect(
      remove(m, {
        registrationId: "other",
        registrationRevision: "other-rev",
        revision: m.docs.get(EVENT)!._rev,
      }),
    ).rejects.toMatchObject({ code: "OPERATION_REUSED" });
    expect(m.docs.has("other")).toBe(true);
  });
  it("never lowers a missing or zero counter below zero", async () => {
    for (const counter of [undefined, 0]) {
      const m = memory([event(counter), entry()]);
      await expect(remove(m)).resolves.toMatchObject({
        previousCount: counter ?? null,
        registrationCount: 0,
      });
      expect(m.docs.get(EVENT)!.competitionRegistrationCount).toBe(0);
    }
  });
  it.each([
    [{ revision: "stale" }, "REVISION_CONFLICT"],
    [{ registrationRevision: "stale" }, "REVISION_CONFLICT"],
    [{ registrationId: "missing" }, "APPLICATION_NOT_FOUND"],
  ])("refuses %o without writing", async (overrides, code) => {
    const m = memory([event(1), entry()]);
    await expect(remove(m, overrides)).rejects.toMatchObject({ code });
    expect(m.docs.has("entry")).toBe(true);
    expect(m.docs.get(EVENT)!.competitionRegistrationCount).toBe(1);
  });
  it("refuses an entry belonging to another event", async () => {
    const m = memory([
      event(1),
      { ...entry(), event: ref("another-event") },
      { _id: "another-event", _rev: "x", _type: "event" },
    ]);
    await expect(remove(m)).rejects.toMatchObject({
      code: "APPLICATION_NOT_FOUND",
    });
  });
  it.each([
    [
      "an unknown document type",
      {
        _id: "other",
        _rev: "o",
        _type: "invoice",
        eventRegister: ref("entry"),
      },
    ],
    [
      "a document referencing a dependent",
      { _id: "other", _rev: "o", _type: "note", approval: ref("approval") },
    ],
  ])("keeps everything when %s still refers to the entry", async (_, extra) => {
    const m = memory([event(1), entry(), ...dependents(), extra]);
    await expect(remove(m)).rejects.toMatchObject({
      code: "REFERENCED_DOCUMENTS",
    });
    expect([...m.docs.keys()].sort()).toEqual(
      [EVENT, "address", "approval", "entry", "image", "other"].sort(),
    );
    expect(m.docs.get(EVENT)!.competitionRegistrationCount).toBe(1);
  });
  it("fails as one unit when the event changes between read and commit", async () => {
    const m = memory([event(1), entry()]);
    const raced = memory([event(1), entry()]);
    // Simulate a signup landing after the precheck: the fenced patch must reject the whole commit.
    const original = raced.db.transaction.bind(raced.db);
    (raced.db as any).transaction = () => {
      raced.docs.set(EVENT, { ...raced.docs.get(EVENT)!, _rev: "moved" });
      return original();
    };
    await expect(remove(raced)).rejects.toMatchObject({ statusCode: 409 });
    expect(raced.docs.has("entry")).toBe(true);
    expect(raced.docs.has(`competition-operation-${OP}`)).toBe(false);
    await expect(remove(m)).resolves.toMatchObject({ registrationCount: 0 });
  });
});

describe("recount registrations", () => {
  it("sets an inflated counter to the indexed registrations and records it", async () => {
    const m = memory([event(3), entry()]);
    await expect(
      recountRegistrations(m.db, EVENT, OP, "event-rev"),
    ).resolves.toEqual({
      previousCount: 3,
      registrationCount: 1,
      changed: true,
    });
    expect(m.docs.get(EVENT)).toMatchObject({
      competitionRegistrationCount: 1,
      competitionWriteFence: 1,
    });
    expect(m.docs.get(`competition-operation-${OP}`)).toMatchObject({
      action: "recount-registrations",
      result: { previousCount: 3, registrationCount: 1, changed: true },
    });
  });
  it("replays a recorded recount without writing again", async () => {
    const m = memory([event(3)]);
    const first = await recountRegistrations(m.db, EVENT, OP, "event-rev");
    const revision = m.docs.get(EVENT)!._rev;
    await expect(
      recountRegistrations(m.db, EVENT, OP, "event-rev"),
    ).resolves.toEqual(first);
    expect(m.docs.get(EVENT)!._rev).toBe(revision);
  });
  it("leaves a correct counter untouched", async () => {
    const m = memory([event(1), entry()]);
    await expect(
      recountRegistrations(m.db, EVENT, OP, "event-rev"),
    ).resolves.toEqual({
      previousCount: 1,
      registrationCount: 1,
      changed: false,
    });
    expect(m.docs.get(EVENT)!._rev).toBe("event-rev");
    expect(m.docs.has(`competition-operation-${OP}`)).toBe(false);
  });
  it("refuses while the index lags the event revision", async () => {
    const m = memory([event(3)], { lagRevision: true });
    await expect(
      recountRegistrations(m.db, EVENT, OP, "event-rev"),
    ).rejects.toMatchObject({ code: "REGISTRATION_INDEX_PENDING" });
    expect(m.docs.get(EVENT)!.competitionRegistrationCount).toBe(3);
  });
  it("refuses a stale event revision", async () => {
    const m = memory([event(3)]);
    await expect(
      recountRegistrations(m.db, EVENT, OP, "stale"),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
  });
});
