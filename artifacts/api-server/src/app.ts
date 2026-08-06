import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { resolveTenant } from "./middleware/resolveTenant";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Trust the proxy so req.hostname uses X-Forwarded-Host in production
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — must respond before tenant resolution so the deployment
// startup probe never touches the database. A suspended/cold DB would
// otherwise make every health check return 500 and block the promote step.
app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/api", (_req, res) => res.json({ status: "ok" }));

// Resolve tenant from subdomain for every request — must run after body parsing
// so requireAdmin body-token fallback works.
app.use(resolveTenant);

app.use("/api/assets", express.static(path.join(__dirname, "../public")));

app.use("/api", router);

export default app;
