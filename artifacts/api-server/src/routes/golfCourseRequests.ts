import { Router, type IRouter } from "express";
import { requireTenant } from "../middleware/resolveTenant";
import {
  GolfCourseRequestLimitError,
  saveGolfCourseRequest,
  validateGolfCourseRequest,
} from "../lib/golfCourseRequests";

export function createGolfCourseRequestsRouter(submit = saveGolfCourseRequest): IRouter {
  const router: IRouter = Router();
  router.post("/golf-course-requests", requireTenant, async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    if (req.tenant?.slug !== "golf") {
      res.status(403).json({ error: "forbidden", message: "Course suggestions are only available on Golf IRL." });
      return;
    }

    const input = validateGolfCourseRequest(req.body);
    if (!input) {
      res.status(400).json({
        error: "invalid_request",
        message: "Enter a course name, an Austin-area address, and a valid email address. Optional links must be HTTP or HTTPS URLs.",
      });
      return;
    }
    try {
      const receipt = await submit(input, req.ip ?? req.socket.remoteAddress ?? "unknown");
      res.status(receipt.duplicate ? 200 : 201).json(receipt);
    } catch (err) {
      if (err instanceof GolfCourseRequestLimitError) {
        res.setHeader("Retry-After", "3600");
        res.status(429).json({ error: "rate_limited", message: err.message });
        return;
      }
      req.log.error("Golf course suggestion could not be saved");
      res.status(503).json({
        error: "save_failed",
        message: "We could not confirm that your suggestion was saved. Please try again. Repeating the same suggestion will not send another notification.",
      });
    }
  });
  return router;
}

export default createGolfCourseRequestsRouter();
