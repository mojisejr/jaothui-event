import { ReactNode } from "react";
import { useEffect, useState } from "react";
import Loading1 from "./Loading1";

interface WaitForReadyProps {
  children: ReactNode;
}
export default function WaitForReady({ children }: WaitForReadyProps) {
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <Loading1 />
      </div>
    );
  }

  return <>{children}</>;
}
