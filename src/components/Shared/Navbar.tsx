import { useLine } from "~/context/lineContext";
import DynamicHeaderTitle from "../Layout/DynamicHeaderTitle";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Navbar() {
  const { profile } = useLine();
  const { pathname } = useRouter();
  return (
    <div className="navbar">
      <div className="navbar-start font-semibold text-primary">
        <img
          src="/images/thuiLogo.png"
          className="w-[50px]"
          alt="jaothui logo"
        />
      </div>
      <div className="navbar-center">
        <DynamicHeaderTitle pathname={pathname} />
      </div>
      <div className="navbar-end">
        {profile ? (
          <Link href="/profile" className="avatar">
            <div className="w-8 rounded-full ring">
              <img src={profile?.pictureUrl} />
            </div>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
