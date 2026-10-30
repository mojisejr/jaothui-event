import { afterEach, describe, expect, it, vi } from "vitest";
import { observable } from "@trpc/server/observable";
import { TRPCClientError, type Operation } from "@trpc/client";
import { safeLogger } from "~/utils/api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("private applicant operation logging", () => {
  it.each([
    "registerEvent.ownedHistory",
    "registerEvent.ownedStatus",
    "registerEvent.applicantPass",
  ])(
    "excludes %s credentials, returned QR and errors from development logging",
    (path) => {
      vi.stubEnv("NODE_ENV", "development");
      const logs = ["log", "error", "warn", "groupCollapsed", "groupEnd"].map(
        (method) =>
          vi
            .spyOn(console, method as "log")
            .mockImplementation(() => undefined),
      );
      const handler = safeLogger({} as Parameters<typeof safeLogger>[0]);
      const op: Operation = {
        id: 1,
        type: "mutation",
        path,
        context: {},
        input: { idToken: "synthetic-private-line" },
      };
      const response = {
        result: { data: { qrUrl: "https://test.invalid/private-qr" } },
        context: {},
      };
      let delivered = false;
      handler({
        op,
        next: () =>
          observable((observer) => {
            observer.next(response);
            observer.complete();
          }),
      }).subscribe({
        next: () => {
          delivered = true;
        },
      });
      handler({
        op,
        next: () =>
          observable((observer) => {
            observer.error(new TRPCClientError("synthetic-private-error"));
          }),
      }).subscribe({ error: () => undefined });
      expect(delivered).toBe(true);
      for (const log of logs) expect(log).not.toHaveBeenCalled();
    },
  );
});
