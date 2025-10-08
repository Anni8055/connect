import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import { createApp } from "./createApp";

const start = async () => {
  const app = await createApp();

  const httpServer = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5500', 10);
  httpServer.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
};

start();
