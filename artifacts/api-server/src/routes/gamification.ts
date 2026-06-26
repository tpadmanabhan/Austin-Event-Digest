import { Router, type IRouter } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getLeaderboard,
  getActiveChallengesWithProgress,
  getBadgesWithEarnedState,
  getOrCreateStreak,
} from "../lib/gamification";

const router: IRouter = Router();

/**
 * GET /api/gamification/leaderboard
 * Returns all active cities ranked by total XP. Requires admin auth.
 */
router.get("/leaderboard", requireAdmin, async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (err) {
    req.log.error({ err }, "Error fetching gamification leaderboard");
    res.status(500).json({ error: "server_error", message: "Failed to fetch leaderboard" });
  }
});

/**
 * GET /api/gamification/me
 * Returns current tenant's XP, rank, badges, active challenges, and streak.
 */
router.get("/me", requireAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;

    const [leaderboard, challenges, badges, streak] = await Promise.all([
      getLeaderboard(),
      getActiveChallengesWithProgress(tenantId),
      getBadgesWithEarnedState(tenantId),
      getOrCreateStreak(tenantId),
    ]);

    const myEntry = leaderboard.find(r => r.tenantId === tenantId);
    const totalXP = myEntry?.totalXP ?? 0;
    const rank = myEntry?.rank ?? leaderboard.length + 1;
    const totalCities = leaderboard.length;

    res.json({
      totalXP,
      rank,
      totalCities,
      streak: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActiveWeek: streak.lastActiveWeek,
      },
      challenges,
      badges,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching gamification profile");
    res.status(500).json({ error: "server_error", message: "Failed to fetch gamification profile" });
  }
});

/**
 * GET /api/gamification/badges
 * Returns all badge definitions with earned state for current tenant.
 */
router.get("/badges", requireAdmin, async (req, res) => {
  try {
    const tenantId = req.tenant!.id;
    const badges = await getBadgesWithEarnedState(tenantId);
    res.json({ badges });
  } catch (err) {
    req.log.error({ err }, "Error fetching badges");
    res.status(500).json({ error: "server_error", message: "Failed to fetch badges" });
  }
});

export default router;
