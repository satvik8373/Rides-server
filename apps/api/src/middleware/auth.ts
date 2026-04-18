import { ErrorCode } from "@ahmedabadcar/shared";
import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/app-error.js";

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError(401, ErrorCode.Unauthorized, "Missing bearer token");
  }

  const token = authorization.replace("Bearer ", "").trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      phoneNumber: payload.phoneNumber,
      mode: payload.mode
    };
    next();
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      throw new AppError(401, ErrorCode.Unauthorized, "Token has expired");
    }
    throw new AppError(401, ErrorCode.Unauthorized, "Invalid token");
  }
};

