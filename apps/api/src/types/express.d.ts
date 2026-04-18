import type { UserMode } from "@ahmedabadcar/shared";

declare global {
  namespace Express {
    interface UserContext {
      userId: string;
      phoneNumber: string;
      mode: UserMode;
    }

    interface Request {
      requestId?: string;
      user?: UserContext;
    }
  }
}

export {};

