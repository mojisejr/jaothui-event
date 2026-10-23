import { ReactNode, createContext, useContext } from "react";
import { useLine } from "./lineContext";
import { api } from "~/utils/api";

type contextType = {
  admin: boolean;
  adminUser?: any;
};

const defaultContext: contextType = { admin: false };

const AdminContext = createContext(defaultContext);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { profile } = useLine();
  const userId = profile?.userId ?? "";
  const { data: user } = api.user.getById.useQuery(
    { userId },
    { enabled: Boolean(userId) },
  );

  const value = {
    admin: Boolean(userId && user?.role === "ADMIN"),
    adminUser: user,
  };
  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
