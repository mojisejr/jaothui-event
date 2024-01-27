import liff from "@line/liff";
import { Liff } from "@line/liff";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Profile } from "~/interfaces/Profile";

type contextType = {
  liff: Liff | undefined;
  loggedIn: boolean;
  profile: Profile | undefined;
  login: () => void;
  logout: () => void;
};

const defaultContext: contextType = {
  liff: undefined,
  loggedIn: false,
  profile: undefined,
  login: () => {},
  logout: () => {},
};

const LineContext = createContext(defaultContext);

export function LineProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile>();
  const [init, setInit] = useState<boolean>(false);

  useEffect(() => {
    initialize();
    updateLoggedInState();

    if (loggedIn) {
      getProfile();
    }
  }, [init, loggedIn]);

  async function updateLoggedInState() {
    if (!init) return;
    liff.isLoggedIn() ? setLoggedIn(true) : setLoggedIn(false);
  }

  async function initialize() {
    try {
      liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! }).then(() => {
        liff.isLoggedIn() ? setLoggedIn(true) : setLoggedIn(false);
        setInit(true);
      });
    } catch (error) {
      console.log(error);
    }
  }

  async function login() {
    if (!init) return;
    if (!loggedIn) {
      liff.login();
    }
  }

  async function getProfile() {
    const profile = await liff.getProfile();
    const email = liff.getDecodedIDToken()?.email;

    console.log({ profile, email });

    setProfile({
      ...profile,
      email,
    });
  }

  async function logout() {
    liff.logout();
    setLoggedIn(false);
  }
  const value = { liff, profile, loggedIn, login, logout };
  return <LineContext.Provider value={value}>{children}</LineContext.Provider>;
}

export function useLine() {
  return useContext(LineContext);
}
