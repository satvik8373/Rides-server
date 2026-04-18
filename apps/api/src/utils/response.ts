import type { ApiEnvelope } from "@ahmedabadcar/shared";
import type { Response } from "express";

export const sendSuccess = <T>(res: Response, data: T, status = 200): Response<ApiEnvelope<T>> => {
  return res.status(status).json({
    success: true,
    data,
    meta: {
      requestId: res.req.requestId,
      timestamp: new Date().toISOString()
    }
  });
};

