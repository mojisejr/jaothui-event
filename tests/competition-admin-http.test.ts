import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import { type NextApiRequest, type NextApiResponse } from "next";
const stubs = vi.hoisted(() => ({ upload: vi.fn(), list: vi.fn() }));
vi.mock("~/server/sanity/client", () => ({
  client: { assets: { upload: stubs.upload } },
}));
vi.mock("~/server/admin/competition-service", () => ({
  CompetitionAdminService: class {
    list = stubs.list;
  },
}));
import handler from "~/pages/api/admin/competitions/[[...path]]";
function exchange(
  path: string[],
  method: string,
  body: Buffer = Buffer.from(""),
  headers: Record<string, string> = {},
) {
  const req = Object.assign(Readable.from([body]), {
    query: { path },
    method,
    headers: { authorization: `Bearer ${"a".repeat(32)}`, ...headers },
  }) as unknown as NextApiRequest;
  const result: { status: number; body: any; headers: Record<string, string> } =
    { status: 0, body: null, headers: {} };
  const res = {
    status: (status: number) => {
      result.status = status;
      return res;
    },
    json: (body: any) => {
      result.body = body;
      return res;
    },
    setHeader: (key: string, value: string) => {
      result.headers[key] = value;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}
beforeEach(() => {
  vi.stubEnv("JAOTHUI_COMPETITION_ADMIN_API_KEY", "a".repeat(32));
  vi.stubEnv("JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED", "true");
  stubs.upload.mockReset();
  stubs.list.mockReset();
});
describe("source competition HTTP boundary", () => {
  it("rejects unauthenticated callers and never invokes read service", async () => {
    const x = exchange([], "GET", undefined, { authorization: "Bearer bad" });
    await handler(x.req, x.res);
    expect(x.result.status).toBe(401);
    expect(stubs.list).not.toHaveBeenCalled();
    expect(x.result.headers["Cache-Control"]).toBe("no-store");
  });
  it("fails closed for all writes when the rollout switch is off", async () => {
    vi.stubEnv("JAOTHUI_COMPETITION_ADMIN_WRITES_ENABLED", "false");
    const x = exchange([], "POST", Buffer.from("{}"));
    await handler(x.req, x.res);
    expect(x.result.status).toBe(503);
    expect(x.result.body.error.code).toBe("WRITES_DISABLED");
  });
  it("enforces the actual streamed image byte limit before uploading", async () => {
    const x = exchange(["cover"], "POST", Buffer.alloc(4 * 1024 * 1024 + 1), {
      "content-type": "image/png",
    });
    await handler(x.req, x.res);
    expect(x.result.status).toBe(413);
    expect(stubs.upload).not.toHaveBeenCalled();
  });
  it("rejects MIME mismatch and SVG input", async () => {
    for (const mime of ["image/png", "image/svg+xml"]) {
      const x = exchange(
        ["cover"],
        "POST",
        Buffer.from("<svg>not an image</svg>"),
        { "content-type": mime },
      );
      await handler(x.req, x.res);
      expect(x.result.status).toBe(415);
    }
    expect(stubs.upload).not.toHaveBeenCalled();
  });
  it("passes only verified raw image bytes to Sanity and returns a safe DTO", async () => {
    stubs.upload.mockResolvedValue({
      _id: "image-test-1x1-png",
      url: "https://cdn.example.test/image.png",
      secret: "not-returned",
    });
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const x = exchange(["cover"], "POST", png, {
      "content-type": "image/png",
      "x-file-name": "../unsafe.png",
    });
    await handler(x.req, x.res);
    expect(x.result.status).toBe(200);
    expect(x.result.body).toEqual({
      data: {
        assetId: "image-test-1x1-png",
        url: "https://cdn.example.test/image.png",
      },
    });
    expect(stubs.upload).toHaveBeenCalledWith("image", png, {
      contentType: "image/png",
      filename: ".._unsafe.png",
    });
  });
  it("returns 422 for malformed calendar input and 400 for invalid JSON without mutating", async () => {
    const x = exchange([], "POST", Buffer.from("{"));
    await handler(x.req, x.res);
    expect(x.result.status).toBe(400);
    const y = exchange(
      [],
      "POST",
      Buffer.from(JSON.stringify({ operationId: "not-a-uuid", input: {} })),
    );
    await handler(y.req, y.res);
    expect(y.result.status).toBe(422);
  });
});
