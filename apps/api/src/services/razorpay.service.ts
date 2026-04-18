import crypto from "crypto";
import Razorpay from "razorpay";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env.js";

interface CreateOrderInput {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}

export class RazorpayService {
  private client?: Razorpay;
  public readonly enabled: boolean;
  private readonly shouldUseMock: boolean;
  private warnedFallback = false;

  constructor() {
    const keyId = env.RAZORPAY_KEY_ID?.trim();
    const keySecret = env.RAZORPAY_KEY_SECRET?.trim();
    const looksLikePlaceholder =
      !keyId ||
      !keySecret ||
      /replace-with|xxxxx/i.test(keyId) ||
      /replace-with|xxxxx/i.test(keySecret);

    this.shouldUseMock = env.NODE_ENV === "test" || looksLikePlaceholder;
    this.enabled = !this.shouldUseMock;
    if (this.enabled) {
      this.client = new Razorpay({
        key_id: keyId ?? "",
        key_secret: keySecret ?? ""
      });
    }
  }

  async createOrder(input: CreateOrderInput): Promise<{ id: string; amount: number; currency: string }> {
    if (!this.client) {
      return {
        id: `order_mock_${uuidv4()}`,
        amount: input.amountInPaise,
        currency: "INR"
      };
    }

    try {
      const order = await this.client.orders.create({
        amount: input.amountInPaise,
        currency: "INR",
        receipt: input.receipt,
        notes: input.notes
      });
      return {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency
      };
    } catch (error) {
      if (env.NODE_ENV !== "production") {
        if (!this.warnedFallback) {
          // eslint-disable-next-line no-console
          console.warn("[Razorpay] Falling back to mock order in non-production environment.", error);
          this.warnedFallback = true;
        }
        return {
          id: `order_mock_${uuidv4()}`,
          amount: input.amountInPaise,
          currency: "INR"
        };
      }
      throw error;
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (this.shouldUseMock || !env.RAZORPAY_KEY_SECRET) {
      return true;
    }
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
    return expected === signature;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      return true;
    }
    const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    return expected === signature;
  }
}

export const razorpayService = new RazorpayService();
