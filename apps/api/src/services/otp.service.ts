import { dataStore } from "../store/data-store.js";
import { normalizePhoneNumber } from "../utils/phone.js";
import { msg91Service } from "./msg91.service.js";

const DEV_OTP = "123456";

export class OtpService {
  generateOtp(): string {
    if (process.env.NODE_ENV !== "production") {
      return DEV_OTP;
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(phoneNumber: string): Promise<{ debugOtp?: string }> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const otp = this.generateOtp();
    dataStore.setOtp(normalizedPhone, otp);
    await msg91Service.sendOtp(normalizedPhone, otp);
    return process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {};
  }

  verifyOtp(phoneNumber: string, otp: string): boolean {
    return dataStore.verifyOtp(normalizePhoneNumber(phoneNumber), otp);
  }
}

export const otpService = new OtpService();
