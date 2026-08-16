import { Router, type IRouter } from "express";
import { getBlocklist } from "../lib/contentFilter";

const router: IRouter = Router();

/**
 * GET /api/content/blocklist
 * Returns the active adult-content blocklist (base phrases + any env var additions).
 * Used by the frontend as a safety-net display-time filter.
 * No auth required — the list is not sensitive.
 */
router.get("/content/blocklist", (_req, res) => {
  res.json({ phrases: getBlocklist() });
});

export default router;
