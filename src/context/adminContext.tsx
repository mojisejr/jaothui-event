import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLine } from "./lineContext";
import { api } from "~/utils/api";

type contextType = {
  admin: boolean;
  adminUser?: any;
};

const defaultContext: contextType = { admin: false };

const AdminContext = createContext(defaultContext);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<boolean>(false);
  const { liff, profile } = useLine();
  const { data: user, refetch } = api.user.getById.useQuery({
    userId: profile?.userId!,
  });

  useEffect(() => {
    void isAdmin();
    void refetch();
  }, [user, liff]);

  async function isAdmin() {
    if (user?.role === "ADMIN") {
      setAdmin(true);
    } else {
      setAdmin(false);
    }
  }

  const value = { admin, adminUser: user };
  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
