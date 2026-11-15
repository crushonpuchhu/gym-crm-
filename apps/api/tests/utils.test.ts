import { describe, it, expect } from "vitest";
import { hash, compare } from "../src/utils/hash";
import { signAccess, verifyAccess } from "../src/utils/jwt";
import { ok, err } from "../src/utils/response";

describe("password hashing", () => {
  it("hashes and verifies passwords", async () => {
    const h = await hash("supersecret");
    expect(h).not.toContain("supersecret");
    expect(await compare("supersecret", h)).toBe(true);
    expect(await compare("wrong", h)).toBe(false);
  });
});

describe("jwt", () => {
  it("round-trips access tokens", () => {
    const token = signAccess({ userId: "user-1", orgId: "org-1" });
    const payload = verifyAccess(token);
    expect(payload.userId).toBe("user-1");
    expect(payload.orgId).toBe("org-1");
  });

  it("rejects tampered tokens", () => {
    const token = signAccess({ userId: "user-1" });
    expect(() => verifyAccess(token.slice(0, -2) + "xx")).toThrow();
  });
});

describe("response helpers", () => {
  it("formats ok responses", () => {
    const res: any = { statusCode: 0, body: null, status(code: number) { this.statusCode = code; return this; }, json(payload: any) { this.body = payload; return this; } };
    ok(res, { hello: "world" }, 201);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, data: { hello: "world" } });
  });

  it("formats error responses", () => {
    const res: any = { statusCode: 0, body: null, status(code: number) { this.statusCode = code; return this; }, json(payload: any) { this.body = payload; return this; } };
    err(res, "bad", "nope", 400, "field");
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, error: { code: "bad", message: "nope", field: "field" } });
  });
});
