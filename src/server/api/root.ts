import { createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "./routers/user";
import { eventRouter } from "./routers/event";
import { registerEventRouter } from "./routers/register-event";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  event: eventRouter,
  registerEvent: registerEventRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
