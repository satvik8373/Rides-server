import { Router } from "express";
import { razorpayService } from "../services/razorpay.service.js";
import { platformService } from "../services/platform.service.js";
import { sendSuccess } from "../utils/response.js";

const router = Router();

router.post("/razorpay", (req, res) => {
  const signature = req.header("x-razorpay-signature") ?? "";
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf-8") : JSON.stringify(req.body ?? {});
  const valid = razorpayService.verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: "PAYMENT_FAILED",
        message: "Invalid webhook signature"
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  const payload = (Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body) as {
    event?: string;
    payload?: unknown;
  };
  return sendSuccess(res, platformService.processRazorpayWebhook(payload.event ?? "unknown", payload));
});

export default router;
