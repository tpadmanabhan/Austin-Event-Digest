import { Router, type IRouter } from "express";
import { createHmac } from "crypto";

const router: IRouter = Router();

router.post("/login", (req, res) => {
  const { password } = req.body ?? {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.status(503).json({ error: "not_configured", message: "Admin password not configured" });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "unauthorized", message: "Incorrect password" });
    return;
  }

  const token = createHmac("sha256", adminPassword)
    .update("admin-session")
    .digest("hex");

  res.json({ token });
});

router.post("/verify", (req, res) => {
  const { token } = req.body ?? {};
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !token) {
    res.status(401).json({ valid: false });
    return;
  }

  const expected = createHmac("sha256", adminPassword)
    .update("admin-session")
    .digest("hex");

  res.json({ valid: token === expected });
});

export default router;
