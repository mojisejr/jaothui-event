import { CreateNewUserDTO } from "~/interfaces/CreateNewUserDTO";
import { db } from "../db";
import { client } from "../../../sanity/lib/client";
import { groq } from "next-sanity";
import { User } from "@prisma/client";

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
