import { Router, type IRouter } from "express";
import healthRouter from "./health";
import newsletterRouter from "./newsletter";
import eventsRouter from "./events";
import rsvpRouter from "./rsvp";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/newsletter", newsletterRouter);
router.use("/events", eventsRouter);
router.use("/rsvp", rsvpRouter);
router.use("/admin", adminRouter);

export default router;
