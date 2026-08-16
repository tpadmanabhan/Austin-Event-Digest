import { Router, type IRouter } from "express";
import healthRouter from "./health";
import newsletterRouter from "./newsletter";
import eventsRouter from "./events";
import rsvpRouter from "./rsvp";
import adminRouter from "./admin";
import tenantsRouter from "./tenants";
import gamificationRouter from "./gamification";
import mapImageRouter from "./mapImage";
import translateRouter from "./translate";
import storageRouter from "./storage";
import dealsRouter from "./deals";
import contentRouter from "./content";
import { requireTenant, requirePlatformRoot } from "../middleware/resolveTenant";

const router: IRouter = Router();

// Platform-level routes — no tenant required (work on root domain)
router.use(healthRouter);
router.use(contentRouter);
router.use(mapImageRouter);
router.use(storageRouter);
// Tenant config + list are used by city subdomains too — no host guard.
// requirePlatformRoot is applied per-route inside tenantsRouter for onboarding-only endpoints.
router.use(tenantsRouter);

// City-level routes — require a resolved tenant from the subdomain
router.use("/newsletter", requireTenant, newsletterRouter);
router.use("/events", requireTenant, eventsRouter);
router.use("/rsvp", requireTenant, rsvpRouter);
router.use("/admin", requireTenant, adminRouter);
router.use("/gamification", requireTenant, gamificationRouter);
router.use(dealsRouter);
router.use(translateRouter);

export default router;
