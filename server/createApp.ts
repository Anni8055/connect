import express, { type Request, type Response, type NextFunction, type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { log } from "./vite";

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

export async function createApp(): Promise<Express> {
  const app = express();

  app.use(helmet({
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-site" },
    contentSecurityPolicy: false,
  }));

  const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);
  app.use("/api", cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (app.get("env") === "development" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }));

  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
  app.use("/api", apiLimiter);

  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json.bind(res);
    (res as any).json = function (bodyJson: any, ...args: any[]) {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson, ...args);
    } as any;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }
        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  return app;
}


