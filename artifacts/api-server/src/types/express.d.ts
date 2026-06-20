import type { Tenant } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

export {};
