import { Router, type IRouter, type Response } from "express";
import {
  and,
  count,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  centinelaActivitiesTable,
  centinelaActivityInterestsTable,
  centinelaResidentsTable,
  centinelaUpdatesTable,
  db,
  subscribersTable,
} from "@workspace/db";
import {
  AddCentinelaResidentBody,
  CreateCentinelaActivityBody,
  CreateCentinelaUpdateBody,
  DeleteCentinelaActivityParams,
  DeleteCentinelaUpdateParams,
  GetCentinelaLocalEventsResponse,
  GetCentinelaResidentPortalResponse,
  ListCentinelaActivitiesResponse,
  ListCentinelaResidentsResponse,
  ListCentinelaUpdatesResponse,
  RemoveCentinelaResidentParams,
  SetCentinelaActivityInterestBody,
  SetCentinelaActivityInterestResponse,
  SetCentinelaActivityInterestParams,
  SetCentinelaNewsletterSubscriptionBody,
  SetCentinelaNewsletterSubscriptionResponse,
  UpdateCentinelaActivityBody,
  UpdateCentinelaActivityParams,
  UpdateCentinelaActivityResponse,
  UpdateCentinelaUpdateBody,
  UpdateCentinelaUpdateParams,
  UpdateCentinelaUpdateResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getCentinelaIdentity,
  requireCentinelaResident,
} from "../lib/centinelaAuth";
import { getCentinelaLocalEvents } from "../lib/centinelaLocalEvents";

const router: IRouter = Router();
const ACTIVE_ACTIVITY_STATUSES = ["proposed"] as const;

router.use((req, res, next) => {
  if (req.tenant?.slug !== "centinela") {
    res.status(404).json({ error: "not_found", message: "Centinela services are unavailable." });
    return;
  }
  next();
});

function sendError(
  res: Response,
  status: number,
  error: string,
  message: string,
): void {
  res.status(status).json({ error, message });
}

function timestamp(value: Date): string {
  return value.toISOString();
}

function updateDTO(row: typeof centinelaUpdatesTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    pinned: row.pinned,
    createdAt: timestamp(row.createdAt),
  };
}

function activityDTO(
  row: typeof centinelaActivitiesTable.$inferSelect,
  interestCount: number,
  interested: boolean,
) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    timingLabel: row.timingLabel,
    status: row.status as "proposed" | "archived",
    isSample: row.isSample,
    interestCount,
    interested,
    createdAt: timestamp(row.createdAt),
  };
}

function residentDTO(row: typeof centinelaResidentsTable.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    createdAt: timestamp(row.createdAt),
  };
}

async function interestCounts(
  tenantId: number,
  activityIds: number[],
): Promise<Map<number, number>> {
  if (activityIds.length === 0) return new Map();
  const rows = await db
    .select({
      activityId: centinelaActivityInterestsTable.activityId,
      value: count(),
    })
    .from(centinelaActivityInterestsTable)
    .where(
      and(
        eq(centinelaActivityInterestsTable.tenantId, tenantId),
        inArray(centinelaActivityInterestsTable.activityId, activityIds),
      ),
    )
    .groupBy(centinelaActivityInterestsTable.activityId);
  return new Map(rows.map((row) => [row.activityId, row.value]));
}

router.get("/local-events", async (req, res): Promise<void> => {
  try {
    const response = GetCentinelaLocalEventsResponse.parse(
      await getCentinelaLocalEvents(),
    );
    res.json(response);
  } catch (err) {
    req.log.warn({ err }, "Santa Monica Localist event preview is unavailable");
    sendError(
      res,
      502,
      "source_unavailable",
      "The local event calendar is temporarily unavailable. Please use the full calendar link.",
    );
  }
});

router.get("/portal", requireCentinelaResident, async (req, res): Promise<void> => {
  const identity = getCentinelaIdentity(req);
  const tenantId = req.tenant!.id;

  try {
    const updates = await db
      .select()
      .from(centinelaUpdatesTable)
      .where(eq(centinelaUpdatesTable.tenantId, tenantId))
      .orderBy(desc(centinelaUpdatesTable.pinned), desc(centinelaUpdatesTable.createdAt));

    const activities = await db
      .select()
      .from(centinelaActivitiesTable)
      .where(
        and(
          eq(centinelaActivitiesTable.tenantId, tenantId),
          inArray(centinelaActivitiesTable.status, [...ACTIVE_ACTIVITY_STATUSES]),
        ),
      )
      .orderBy(desc(centinelaActivitiesTable.createdAt));

    const activityIds = activities.map((activity) => activity.id);
    const [counts, interestedRows, [subscriber]] = await Promise.all([
      interestCounts(tenantId, activityIds),
      activityIds.length
        ? db
            .select({ activityId: centinelaActivityInterestsTable.activityId })
            .from(centinelaActivityInterestsTable)
            .where(
              and(
                eq(centinelaActivityInterestsTable.tenantId, tenantId),
                eq(centinelaActivityInterestsTable.clerkUserId, identity.userId),
                inArray(centinelaActivityInterestsTable.activityId, activityIds),
              ),
            )
        : Promise.resolve([]),
      db
        .select({ isActive: subscribersTable.isActive })
        .from(subscribersTable)
        .where(
          and(
            eq(subscribersTable.tenantId, tenantId),
            eq(subscribersTable.email, identity.email),
          ),
        )
        .limit(1),
    ]);
    const interestedIds = new Set(interestedRows.map((row) => row.activityId));

    res.json(
      GetCentinelaResidentPortalResponse.parse({
        residentEmail: identity.email,
        updates: updates.map(updateDTO),
        activities: activities.map((activity) =>
          activityDTO(
            activity,
            counts.get(activity.id) ?? 0,
            interestedIds.has(activity.id),
          ),
        ),
        newsletterSubscribed: subscriber?.isActive ?? false,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Error loading Centinela resident portal");
    sendError(res, 500, "server_error", "Failed to load resident information.");
  }
});

router.put(
  "/activities/:activityId/interest",
  requireCentinelaResident,
  async (req, res): Promise<void> => {
    const params = SetCentinelaActivityInterestParams.safeParse(req.params);
    const body = SetCentinelaActivityInterestBody.safeParse(req.body);
    if (!params.success || !body.success) {
      sendError(res, 400, "invalid_request", "The activity interest request is invalid.");
      return;
    }

    const identity = getCentinelaIdentity(req);
    const tenantId = req.tenant!.id;
    try {
      const [activity] = await db
        .select({ id: centinelaActivitiesTable.id })
        .from(centinelaActivitiesTable)
        .where(
          and(
            eq(centinelaActivitiesTable.id, params.data.activityId),
            eq(centinelaActivitiesTable.tenantId, tenantId),
            inArray(centinelaActivitiesTable.status, [...ACTIVE_ACTIVITY_STATUSES]),
          ),
        )
        .limit(1);
      if (!activity) {
        sendError(res, 404, "not_found", "This activity is no longer available.");
        return;
      }

      if (body.data.interested) {
        await db
          .insert(centinelaActivityInterestsTable)
          .values({
            tenantId,
            activityId: activity.id,
            clerkUserId: identity.userId,
          })
          .onConflictDoNothing();
      } else {
        await db
          .delete(centinelaActivityInterestsTable)
          .where(
            and(
              eq(centinelaActivityInterestsTable.tenantId, tenantId),
              eq(centinelaActivityInterestsTable.activityId, activity.id),
              eq(centinelaActivityInterestsTable.clerkUserId, identity.userId),
            ),
          );
      }

      const counts = await interestCounts(tenantId, [activity.id]);
      res.json(
        SetCentinelaActivityInterestResponse.parse({
          activityId: activity.id,
          interested: body.data.interested,
          interestCount: counts.get(activity.id) ?? 0,
        }),
      );
    } catch (err) {
      req.log.error({ err }, "Error saving Centinela activity interest");
      sendError(res, 500, "server_error", "Failed to save activity interest.");
    }
  },
);

router.put(
  "/newsletter",
  requireCentinelaResident,
  async (req, res): Promise<void> => {
    const body = SetCentinelaNewsletterSubscriptionBody.safeParse(req.body);
    if (!body.success) {
      sendError(res, 400, "invalid_request", "Choose whether to receive resident updates.");
      return;
    }

    const identity = getCentinelaIdentity(req);
    const tenantId = req.tenant!.id;
    try {
      if (body.data.subscribed) {
        await db
          .insert(subscribersTable)
          .values({ tenantId, email: identity.email, isActive: true })
          .onConflictDoUpdate({
            target: [subscribersTable.tenantId, subscribersTable.email],
            set: { isActive: true },
          });
      } else {
        await db
          .update(subscribersTable)
          .set({ isActive: false })
          .where(
            and(
              eq(subscribersTable.tenantId, tenantId),
              eq(subscribersTable.email, identity.email),
            ),
          );
      }

      res.json(
        SetCentinelaNewsletterSubscriptionResponse.parse({
          subscribed: body.data.subscribed,
        }),
      );
    } catch (err) {
      req.log.error({ err }, "Error saving Centinela newsletter preference");
      sendError(res, 500, "server_error", "Failed to save the email preference.");
    }
  },
);

router.get("/admin/residents", requireAdmin, async (req, res): Promise<void> => {
  try {
    const residents = await db
      .select()
      .from(centinelaResidentsTable)
      .where(eq(centinelaResidentsTable.tenantId, req.tenant!.id))
      .orderBy(centinelaResidentsTable.email);
    res.json(
      ListCentinelaResidentsResponse.parse({
        residents: residents.map(residentDTO),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Error listing Centinela residents");
    sendError(res, 500, "server_error", "Failed to load the approved resident list.");
  }
});

router.post("/admin/residents", requireAdmin, async (req, res): Promise<void> => {
  const body = AddCentinelaResidentBody.safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, "invalid_request", "Enter a valid resident email address.");
    return;
  }

  const email = body.data.email.trim().toLowerCase();
  try {
    const [resident] = await db
      .insert(centinelaResidentsTable)
      .values({ tenantId: req.tenant!.id, email })
      .onConflictDoNothing()
      .returning();

    let result = resident;
    if (!result) {
      [result] = await db
        .select()
        .from(centinelaResidentsTable)
        .where(
          and(
            eq(centinelaResidentsTable.tenantId, req.tenant!.id),
            eq(centinelaResidentsTable.email, email),
          ),
        )
        .limit(1);
    }

    if (!result) {
      sendError(res, 500, "server_error", "Could not approve this email address.");
      return;
    }

    res.status(201).json({ resident: residentDTO(result) });
  } catch (err) {
    req.log.error({ err }, "Error approving Centinela resident email");
    sendError(res, 500, "server_error", "Could not approve this email address.");
  }
});

router.delete(
  "/admin/residents/:residentId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = RemoveCentinelaResidentParams.safeParse(req.params);
    if (!params.success) {
      sendError(res, 400, "invalid_request", "Resident ID is invalid.");
      return;
    }

    try {
      const resident = await db.transaction(async (tx) => {
        const [removed] = await tx
          .delete(centinelaResidentsTable)
          .where(
            and(
              eq(centinelaResidentsTable.id, params.data.residentId),
              eq(centinelaResidentsTable.tenantId, req.tenant!.id),
            ),
          )
          .returning({ email: centinelaResidentsTable.email });

        if (removed) {
          await tx
            .update(subscribersTable)
            .set({ isActive: false })
            .where(
              and(
                eq(subscribersTable.tenantId, req.tenant!.id),
                eq(subscribersTable.email, removed.email),
              ),
            );
        }
        return removed;
      });

      if (!resident) {
        sendError(res, 404, "not_found", "Resident email was not found.");
        return;
      }
      res.status(204).end();
    } catch (err) {
      req.log.error({ err }, "Error revoking Centinela resident access");
      sendError(res, 500, "server_error", "Could not revoke resident access.");
    }
  },
);

router.get("/admin/updates", requireAdmin, async (req, res): Promise<void> => {
  try {
    const updates = await db
      .select()
      .from(centinelaUpdatesTable)
      .where(eq(centinelaUpdatesTable.tenantId, req.tenant!.id))
      .orderBy(desc(centinelaUpdatesTable.pinned), desc(centinelaUpdatesTable.createdAt));
    res.json(
      ListCentinelaUpdatesResponse.parse({ updates: updates.map(updateDTO) }),
    );
  } catch (err) {
    req.log.error({ err }, "Error listing Centinela HOA updates");
    sendError(res, 500, "server_error", "Failed to load HOA updates.");
  }
});

router.post("/admin/updates", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateCentinelaUpdateBody.safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, "invalid_request", "Check the update title and message.");
    return;
  }
  try {
    const [update] = await db
      .insert(centinelaUpdatesTable)
      .values({ ...body.data, tenantId: req.tenant!.id })
      .returning();
    res.status(201).json({ update: updateDTO(update) });
  } catch (err) {
    req.log.error({ err }, "Error creating Centinela HOA update");
    sendError(res, 500, "server_error", "Could not publish this HOA update.");
  }
});

router.patch(
  "/admin/updates/:updateId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateCentinelaUpdateParams.safeParse(req.params);
    const body = UpdateCentinelaUpdateBody.safeParse(req.body);
    if (!params.success || !body.success) {
      sendError(res, 400, "invalid_request", "Check the HOA update details.");
      return;
    }
    try {
      const [update] = await db
        .update(centinelaUpdatesTable)
        .set(body.data)
        .where(
          and(
            eq(centinelaUpdatesTable.id, params.data.updateId),
            eq(centinelaUpdatesTable.tenantId, req.tenant!.id),
          ),
        )
        .returning();
      if (!update) {
        sendError(res, 404, "not_found", "HOA update was not found.");
        return;
      }
      res.json(
        UpdateCentinelaUpdateResponse.parse({ update: updateDTO(update) }),
      );
    } catch (err) {
      req.log.error({ err }, "Error updating Centinela HOA update");
      sendError(res, 500, "server_error", "Could not save this HOA update.");
    }
  },
);

router.delete(
  "/admin/updates/:updateId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = DeleteCentinelaUpdateParams.safeParse(req.params);
    if (!params.success) {
      sendError(res, 400, "invalid_request", "HOA update ID is invalid.");
      return;
    }
    try {
      const [update] = await db
        .delete(centinelaUpdatesTable)
        .where(
          and(
            eq(centinelaUpdatesTable.id, params.data.updateId),
            eq(centinelaUpdatesTable.tenantId, req.tenant!.id),
          ),
        )
        .returning({ id: centinelaUpdatesTable.id });
      if (!update) {
        sendError(res, 404, "not_found", "HOA update was not found.");
        return;
      }
      res.status(204).end();
    } catch (err) {
      req.log.error({ err }, "Error deleting Centinela HOA update");
      sendError(res, 500, "server_error", "Could not delete this HOA update.");
    }
  },
);

router.get("/admin/activities", requireAdmin, async (req, res): Promise<void> => {
  try {
    const activities = await db
      .select()
      .from(centinelaActivitiesTable)
      .where(eq(centinelaActivitiesTable.tenantId, req.tenant!.id))
      .orderBy(desc(centinelaActivitiesTable.createdAt));
    const counts = await interestCounts(
      req.tenant!.id,
      activities.map((activity) => activity.id),
    );
    res.json(
      ListCentinelaActivitiesResponse.parse({
        activities: activities.map((activity) =>
          activityDTO(activity, counts.get(activity.id) ?? 0, false),
        ),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Error listing Centinela activities");
    sendError(res, 500, "server_error", "Failed to load resident activities.");
  }
});

router.post("/admin/activities", requireAdmin, async (req, res): Promise<void> => {
  const body = CreateCentinelaActivityBody.safeParse(req.body);
  if (!body.success) {
    sendError(res, 400, "invalid_request", "Check the activity title and details.");
    return;
  }
  try {
    const [activity] = await db
      .insert(centinelaActivitiesTable)
      .values({
        ...body.data,
        tenantId: req.tenant!.id,
        status: "proposed",
        isSample: false,
      })
      .returning();
    res.status(201).json({
      activity: activityDTO(activity, 0, false),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating Centinela activity");
    sendError(res, 500, "server_error", "Could not create this activity.");
  }
});

router.patch(
  "/admin/activities/:activityId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateCentinelaActivityParams.safeParse(req.params);
    const body = UpdateCentinelaActivityBody.safeParse(req.body);
    if (!params.success || !body.success) {
      sendError(res, 400, "invalid_request", "Check the activity details.");
      return;
    }
    try {
      const [activity] = await db
        .update(centinelaActivitiesTable)
        .set(body.data)
        .where(
          and(
            eq(centinelaActivitiesTable.id, params.data.activityId),
            eq(centinelaActivitiesTable.tenantId, req.tenant!.id),
          ),
        )
        .returning();
      if (!activity) {
        sendError(res, 404, "not_found", "Activity was not found.");
        return;
      }
      const [counts] = await db
        .select({ value: count() })
        .from(centinelaActivityInterestsTable)
        .where(
          and(
            eq(centinelaActivityInterestsTable.tenantId, req.tenant!.id),
            eq(centinelaActivityInterestsTable.activityId, activity.id),
          ),
        );
      res.json(
        UpdateCentinelaActivityResponse.parse({
          activity: activityDTO(activity, counts?.value ?? 0, false),
        }),
      );
    } catch (err) {
      req.log.error({ err }, "Error updating Centinela activity");
      sendError(res, 500, "server_error", "Could not save this activity.");
    }
  },
);

router.delete(
  "/admin/activities/:activityId",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = DeleteCentinelaActivityParams.safeParse(req.params);
    if (!params.success) {
      sendError(res, 400, "invalid_request", "Activity ID is invalid.");
      return;
    }
    try {
      const [activity] = await db
        .delete(centinelaActivitiesTable)
        .where(
          and(
            eq(centinelaActivitiesTable.id, params.data.activityId),
            eq(centinelaActivitiesTable.tenantId, req.tenant!.id),
          ),
        )
        .returning({ id: centinelaActivitiesTable.id });
      if (!activity) {
        sendError(res, 404, "not_found", "Activity was not found.");
        return;
      }
      res.status(204).end();
    } catch (err) {
      req.log.error({ err }, "Error deleting Centinela activity");
      sendError(res, 500, "server_error", "Could not delete this activity.");
    }
  },
);

export default router;
