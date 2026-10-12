import { Router, type IRouter } from "express";
import { requirePlatformRoot } from "../middleware/resolveTenant";
import { CityRequestLimitError, saveCityRequest, validateCityRequest } from "../lib/cityRequests";

export function createCityRequestsRouter(submit = saveCityRequest): IRouter {
  const router: IRouter = Router();
  router.post("/city-requests", requirePlatformRoot, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const input = validateCityRequest(req.body);
    if (!input) {
      res.status(400).json({
        error: "invalid_request",
        message: "Enter a city name (2–100 characters) and a valid email address (up to 254 characters).",
      });
      return;
    }
    try {
      const receipt = await submit(input, req.ip ?? req.socket.remoteAddress ?? "unknown");
      res.status(receipt.duplicate ? 200 : 201).json(receipt);
    } catch (err) {
      if (err instanceof CityRequestLimitError) {
        res.setHeader("Retry-After", "3600");
        res.status(429).json({ error: "rate_limited", message: err.message });
        return;
      }
      req.log.error("City request could not be saved");
      res.status(503).json({
        error: "save_failed",
        message: "We could not confirm that your request was saved. Please try again. Repeating the same request will not send another notification.",
      });
    }
  });
  return router;
}

export default createCityRequestsRouter();
