import { createApp } from "../server/createApp";

export default async function handler(req: any, res: any) {
  const app = await createApp();
  // lazy-load to avoid top-level require in Vercel edge analyzer
  const { createServer } = await import("http");
  const server = createServer(app);
  server.emit('request', req, res);
}


