import * as line from "@line/bot-sdk";

export const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.oa_token!,
});
