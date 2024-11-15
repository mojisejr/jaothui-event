import React from "react";
import { AdminProvider } from "~/context/adminContext";
import { LineProvider } from "~/context/lineContext";

interface ProviderProps {
  children: React.ReactNode;
}
export default function Providers({ children }: ProviderProps) {
  return (
    <>
      <LineProvider>
        <AdminProvider>{children}</AdminProvider>
      </LineProvider>
    </>
  );
}
