import { z } from "zod";
export const sendOtpSchema = z.object({
    phoneNumber: z.string().min(10).max(15)
});
export const verifyOtpSchema = z.object({
    phoneNumber: z.string().min(10).max(15),
    otp: z.string().min(4).max(6)
});
