import { groq } from "next-sanity";
import { client } from "../../../sanity/lib/client";
import { User } from "~/interfaces/User";

enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
}

export const isAdmin = async (id: string) => {
  try {
    const query = groq`*[_type == "user" && lineId == "${id}"  && role == "${Role.ADMIN}"]{role}[0]`;
    const result = await client.fetch<User>(query);

    return result.role == Role.ADMIN ? true : false;
  } catch (error) {
    console.log(error);
    return null;
  }
};
