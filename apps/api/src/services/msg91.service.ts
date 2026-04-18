import axios from "axios";
import { env } from "../config/env.js";

export class Msg91Service {
  private enabled: boolean;

  constructor() {
    this.enabled = Boolean(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID && env.MSG91_FLOW_ID);
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      {
        template_id: env.MSG91_TEMPLATE_ID,
        short_url: "0",
        recipients: [
          {
            mobiles: phoneNumber.replace("+", ""),
            otp
          }
        ]
      },
      {
        headers: {
          authkey: env.MSG91_AUTH_KEY ?? "",
          accept: "application/json",
          "content-type": "application/json"
        },
        timeout: 10_000
      }
    );
  }
}

export const msg91Service = new Msg91Service();

