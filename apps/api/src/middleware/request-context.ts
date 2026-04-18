import { v4 as uuidv4 } from "uuid";
import type { NextFunction, Request, Response } from "express";

export const requestContextMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  req.requestId = req.header("x-request-id") ?? uuidv4();
  next();
};

