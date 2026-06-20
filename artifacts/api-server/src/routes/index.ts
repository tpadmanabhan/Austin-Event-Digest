import { Router, type IRouter } from "express";
import healthRouter from "./health";
import newsletterRouter from "./newsletter";
import eventsRouter from "./events";
import rsvpRouter from "./rsvp";
import adminRouter from "./admin";
import tenantsRouter from "./tenants";
import { requireTenant } from "../middleware/resolveTenant";

const router: IRouter = Router();

// Platform-level routes — no tenant required (work on root domain)
router.use(healthRouter);
router.use(tenantsRouter);

// City-level routes — require a resolved tenant from the subdomain
router.use("/newsletter", requireTenant, newsletterRouter);
router.use("/events", requireTenant, eventsRouter);
router.use("/rsvp", requireTenant, rsvpRouter);
router.use("/admin", requireTenant, adminRouter);

export default router;
