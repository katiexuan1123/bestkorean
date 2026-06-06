import type { IncomingMessage, ServerResponse } from "node:http";
import { createApiApp } from "../server";

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
