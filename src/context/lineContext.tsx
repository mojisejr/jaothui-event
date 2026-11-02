import { isApplicantEventId, FRONT_RETURN_PATH } from "~/lib/applicant-intent";
import liff, { type Liff } from "@line/liff";
import { useRouter } from "next/router";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { type Profile } from "~/interfaces/Profile";
import { setApplicantTransport } from "~/utils/applicant-auth";

type ContextType = {
  liff: Liff | undefined;
  loggedIn: boolean;
  profile: Profile | undefined;
  authReady: boolean;
  authMode: "liff" | "sso" | "blocked";
  authError: string;
  returnToFront?: typeof FRONT_RETURN_PATH;
  login: () => void;
  logout: () => void;
};
const LineContext = createContext<ContextType>({
  liff: undefined,
  loggedIn: false,
  profile: undefined,
  authReady: false,
  authMode: "blocked",
  authError: "",
  login: () => undefined,
  logout: () => undefined,
});
export function LineProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>();
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<ContextType["authMode"]>("blocked");
  const [authError, setAuthError] = useState("");
  const [sdk, setSdk] = useState<Liff>();
  const [returnToFront, setReturnToFront] =
    useState<ContextType["returnToFront"]>();
  useEffect(() => {
    let alive = true;
    async function initialize() {
      try {
        const response = await fetch("/api/auth/front/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const session = (await response.json()) as {
          mode?: string;
          profile?: Profile;
          returnToFront?: unknown;
        };
        if (!alive) return;
        if (session.returnToFront === FRONT_RETURN_PATH)
          setReturnToFront(FRONT_RETURN_PATH);
        if (!response.ok || session.mode === "blocked") {
          setApplicantTransport("blocked");
          setAuthError(
            response.status === 503
              ? "ระบบยืนยันตัวตนไม่พร้อม กรุณาโหลดใหม่"
              : "กรุณาเริ่มเข้าสู่ระบบใหม่",
          );
          setAuthReady(true);
          return;
        }
        if (session.mode === "sso" && session.profile?.userId) {
          setApplicantTransport("sso");
          setAuthMode("sso");
          setProfile(session.profile);
          setLoggedIn(true);
          setAuthReady(true);
          return;
        }
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!alive) return;
        setApplicantTransport("liff", liff);
        setSdk(liff);
        setAuthMode("liff");
        if (liff.isLoggedIn()) {
          const lineProfile = await liff.getProfile();
          if (!alive) return;
          setProfile({
            ...lineProfile,
            email: liff.getDecodedIDToken()?.email as string | undefined,
          });
          setLoggedIn(true);
        }
        setAuthReady(true);
      } catch {
        if (alive) {
          setAuthError("โหลดระบบเข้าสู่ระบบไม่สำเร็จ กรุณาโหลดใหม่");
          setAuthReady(true);
        }
      }
    }
    void initialize();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (authReady && loggedIn && router.pathname === "/")
      void router.replace("/profile");
  }, [authReady, loggedIn, router.pathname, router]);
  function login() {
    if (sdk && authMode === "liff") {
      sdk.login({ redirectUri: window.location.href });
      return;
    }
    const eventId =
      typeof router.query.eventId === "string"
        ? router.query.eventId
        : undefined;
    if (isApplicantEventId(eventId))
      window.location.assign(
        `/api/auth/front/start?eventId=${encodeURIComponent(eventId)}`,
      );
    else void router.push("/events");
  }
  async function logout() {
    if (authMode === "sso") {
      try {
        const response = await fetch("/api/auth/front/logout", {
          method: "POST",
          headers: { "X-Jaothui-CSRF": "1" },
          credentials: "same-origin",
        });
        if (!response.ok) {
          setAuthError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
          return;
        }
      } catch {
        setAuthError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setApplicantTransport("blocked");
      setAuthMode("blocked");
    } else sdk?.logout();
    setAuthError("");
    setLoggedIn(false);
    setProfile(undefined);
  }
  return (
    <LineContext.Provider
      value={{
        liff: sdk,
        loggedIn,
        profile,
        authReady,
        authMode,
        authError,
        returnToFront,
        login,
        logout: () => {
          void logout();
        },
      }}
    >
      {returnToFront ? (
        <div className="mx-auto flex w-full max-w-7xl justify-end px-2 sm:px-4">
          <a
            href={returnToFront}
            className="btn btn-ghost min-h-[44px] text-primary"
          >
            กลับเว็บไซต์เจ้าทุย
          </a>
        </div>
      ) : null}
      {authError ? (
        <p role="alert" className="p-4 text-secondary">
          {authError}
        </p>
      ) : null}
      {children}
    </LineContext.Provider>
  );
}
export function useLine() {
  return useContext(LineContext);
}
