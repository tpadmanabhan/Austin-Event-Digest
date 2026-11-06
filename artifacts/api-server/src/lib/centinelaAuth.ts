import { clerkClient, getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { centinelaResidentsTable, db } from "@workspace/db";

export type CentinelaIdentity = {
  userId: string;
  email: string;
};

type CentinelaRequest = Request & {
  centinelaIdentity?: CentinelaIdentity;
};

export async function requireCentinelaResident(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.tenant?.slug !== "centinela") {
    res.status(404).json({ error: "not_found", message: "Centinela resident services are unavailable." });
    return;
  }

  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "Sign in to access resident features." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId,
    );
    const email = primaryEmail?.emailAddress.trim().toLowerCase();

    if (!email || primaryEmail?.verification?.status !== "verified") {
      res.status(403).json({
        error: "resident_access_required",
        message: "A verified email address is required for resident access.",
      });
      return;
    }

    const isTenantAdmin = email === req.tenant.adminEmail?.trim().toLowerCase();
    if (!isTenantAdmin) {
      const [approved] = await db
        .select({ id: centinelaResidentsTable.id })
        .from(centinelaResidentsTable)
        .where(
          and(
            eq(centinelaResidentsTable.tenantId, req.tenant.id),
            eq(centinelaResidentsTable.email, email),
          ),
        )
        .limit(1);

      if (!approved) {
        res.status(403).json({
          error: "resident_access_required",
          message: "This verified email is not on the approved resident list.",
        });
        return;
      }
    }

    (req as CentinelaRequest).centinelaIdentity = { userId, email };
    next();
  } catch (err) {
    req.log.error({ err, userId }, "Could not verify Centinela resident identity");
    res.status(503).json({
      error: "identity_unavailable",
      message: "Resident access could not be verified right now. Please try again.",
    });
  }
}

export function getCentinelaIdentity(req: Request): CentinelaIdentity {
  const identity = (req as CentinelaRequest).centinelaIdentity;
  if (!identity) {
    throw new Error("Centinela resident identity is missing after authorization.");
  }
  return identity;
}
