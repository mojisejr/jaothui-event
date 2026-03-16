import { CreateNewUserDTO } from "~/interfaces/CreateNewUserDTO";
import { db } from "../db";
import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { User } from "@prisma/client";
import {
  calculateProfileStats as calculateProfileStatsFromRegisters,
  type ProfileStatsRegister,
} from "~/server/services/profile-stats.service";

function sanitizeSanityLiteral(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function getProfileStatsByUserId(userId: string) {
  try {
    const safeUserId = sanitizeSanityLiteral(userId);
    const query = groq`*[_type == "eventRegister" && user._ref == "${safeUserId}"]{
      _id,
      "event": event->{ _id, endAt, isActive }
    }`;

    const registers = await client.fetch<ProfileStatsRegister[]>(query);
    return calculateProfileStatsFromRegisters(registers);
  } catch (error) {
    console.log(error);
    return {
      activeBuffaloCount: 0,
      activeEventCount: 0,
      evaluatedRegisterCount: 0,
    };
  }
}

export async function getUserByUserId(userId: string) {
  try {
    const query = groq`*[_type == "user" && lineId == "${userId}"]
    {
    "userId": lineId,
    role,
    tel,
    email
    }
    [0]`;

    const user = await client.fetch<User>(query);

    return user;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function createNewUser(user: CreateNewUserDTO) {
  try {
    const userDoc = {
      _type: "user",
      _id: user.userId,
      lineId: user.userId,
      email: user.email,
      tel: user.tel,
      role: "USER",
    };

    const created = await client.create(userDoc);

    return created;
  } catch (error) {
    console.log(error);
    return null;
  }
}
