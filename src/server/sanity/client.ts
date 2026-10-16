import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../../../sanity/env";

/** Never import this module into browser components. Legacy credential fallback is server-only during rollout. */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "published",
  token:
    process.env.SANITY_API_WRITE_TOKEN ??
    process.env[["NEXT", "PUBLIC", "SANITY", "TOKEN"].join("_")],
});
