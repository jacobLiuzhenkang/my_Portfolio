import { handle } from "@hono/node-server/vercel";
import app from "./boot";

export default handle(app);
