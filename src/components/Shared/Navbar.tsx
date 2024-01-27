import DynamicHeaderTitle from "../Layout/DynamicHeaderTitle";
import { useRouter } from "next/router";

export default function Navbar() {
  const { pathname } = useRouter();
  return (
    <div className="navbar">
      <div className="navbar-start text-primary font-semibold">
        <img
          src="/images/thuiLogo.png"
          className="w-[50px]"
          alt="jaothui logo"
        />
      </div>
      <div className="navbar-center">
        <DynamicHeaderTitle pathname={pathname} />
      </div>
      <div className="navbar-end"></div>
    </div>
  );
}
