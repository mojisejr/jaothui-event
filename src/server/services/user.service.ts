import { CreateNewUserDTO } from "~/interfaces/CreateNewUserDTO";
import { db } from "../db";

export async function getUserByUserId(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: {
        userId,
      },
    });

    console.log(user);
    return user;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function createNewUser(user: CreateNewUserDTO) {
  try {
    const created = await db.user.create({ data: { ...user, role: "USER" } });
    return created;
  } catch (error) {
    console.log(error);
    return null;
  }
}
