import type { BookingWithDetails } from "@ahmedabadcar/shared";
import Constants from "expo-constants";
import { appConfig } from "./config";

export interface RazorpayCheckoutInput {
  orderId: string;
  amount: number;
  userName: string;
  userEmail?: string;
  userPhone: string;
  booking: BookingWithDetails;
}

type RazorpayCheckoutModule = {
  open: (options: {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name?: string;
    description?: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
  }) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>;
};

const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

const loadRazorpayModule = (): RazorpayCheckoutModule | undefined => {
  try {
    // Lazy runtime import prevents Expo Go from crashing on startup.
    const mod = require("react-native-razorpay");
    return (mod?.default ?? mod) as RazorpayCheckoutModule;
  } catch {
    return undefined;
  }
};

export const razorpayService = {
  async pay(input: RazorpayCheckoutInput): Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }> {
    if (isExpoGo) {
      throw new Error("Razorpay checkout requires a development build or standalone app. Expo Go does not include this native module.");
    }

    const razorpayCheckout = loadRazorpayModule();
    if (!razorpayCheckout?.open) {
      throw new Error("Razorpay native module is unavailable. Rebuild the app with native dependencies.");
    }

    const options = {
      name: "AhmedabadCar",
      description: "Ride Booking Payment",
      order_id: input.orderId,
      currency: "INR",
      amount: Math.round(input.amount * 100),
      key: appConfig.razorpayKeyId,
      prefill: {
        name: input.userName,
        email: input.userEmail ?? "",
        contact: input.userPhone
      },
      theme: {
        color: "#0f6e56"
      }
    };

    return razorpayCheckout.open(options);
  }
};
