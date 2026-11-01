import { applicantBridgeHandler } from "~/server/services/competition-applicant-bridge";

export const config = { api: { bodyParser: false } };
export default applicantBridgeHandler();
