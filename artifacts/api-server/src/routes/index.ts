import { Router, type IRouter } from "express";
import healthRouter from "./health";
import newsletterRouter from "./newsletter";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/newsletter", newsletterRouter);
router.use("/events", eventsRouter);

export default router;
