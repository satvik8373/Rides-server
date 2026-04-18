import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { dataStore } from "../store/data-store.js";

describe("Auth API", () => {
  beforeEach(() => {
    dataStore.reset();
  });

  it("sends and verifies otp", async () => {
    const app = createApp();
    const send = await request(app).post("/v1/auth/send-otp").send({ phoneNumber: "+919500000001" });
    expect(send.status).toBe(200);
    expect(send.body.success).toBe(true);

    const verify = await request(app).post("/v1/auth/verify-otp").send({
      phoneNumber: "+919500000001",
      otp: "123456"
    });
    expect(verify.status).toBe(200);
    expect(verify.body.data.accessToken).toBeTypeOf("string");
    expect(verify.body.data.refreshToken).toBeTypeOf("string");
  });
});

