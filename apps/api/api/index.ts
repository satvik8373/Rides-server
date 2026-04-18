import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "./app.js";

const app = createApp();

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
