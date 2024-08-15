import { createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "./routers/user";
import { eventRouter } from "./routers/event";
import { registerEventRouter } from "./routers/register-event";
// import { votesRouter } from "./routers/votes";
import { votesRouterV2 } from "./routers/votes-v2";
import { metadataRouter } from "./routers/metadata";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  event: eventRouter,
  registerEvent: registerEventRouter,
  votes: votesRouterV2,
  metadata: metadataRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
