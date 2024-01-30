import { lineClient } from "./line";
import { v4 as uuidv4 } from "uuid";

export async function notify(userId: string, message: string) {
  try {
    const response = await lineClient.pushMessage(
      {
        to: userId,
        messages: [{ type: "text", text: message }],
      },
      uuidv4(),
    );
    console.log(response);
  } catch (error) {
    console.log(error);
  }
}
