import type { Tenant } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant & { adminEmails?: string[] };
    }
  }
}

export {};
