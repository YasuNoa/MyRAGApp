import { handle } from "hono/vercel";
import app from "@/src/index";

export const GET = handle(app);
export const POST = handle(app);
