import { ErrorCode, type ApiEnvelope } from "@ahmedabadcar/shared";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";

export const errorHandlerMiddleware = (error: unknown, req: Request, res: Response<ApiEnvelope<never>>, _next: NextFunction): void => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.ValidationFailed,
        message: "Request validation failed",
        details: error.flatten()
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Log unexpected errors
  // eslint-disable-next-line no-console
  console.error("[ErrorHandler] Unexpected error:", error instanceof Error ? error.stack : error);

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.Unknown,
      message: "Unexpected server error"
    },
    meta: {
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
};

