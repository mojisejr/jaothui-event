import { useLine } from "~/context/lineContext";
import DynamicHeaderTitle from "../Layout/DynamicHeaderTitle";
import { useRouter } from "next/router";
import Link from "next/link";
import { FaArrowLeftLong } from "react-icons/fa6";
import { motion } from "framer-motion";

export default function Navbar() {
  const { profile } = useLine();
  const { pathname, back } = useRouter();
  return (
    <div className="font-prompt navbar">
      <div className="navbar-start font-semibold text-primary">
        {pathname === "/" ? (
          <motion.img
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, type: "tween", ease: "backIn" }}
            src="/images/thuiLogo.png"
            className="w-[50px]"
            alt="jaothui logo"
          />
        ) : (
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, type: "tween", ease: "backIn" }}
            className="btn btn-ghost text-primary"
            onClick={() => back()}
          >
            <div>
              <FaArrowLeftLong size={24} />
              <span>กลับ</span>
            </div>
          </motion.button>
        )}
      </div>
      <div className="navbar-center">
        <DynamicHeaderTitle pathname={pathname} />
      </div>
      <div className="navbar-end px-2">
        {profile ? (
          <Link href="/profile" className="avatar">
            <div className="w-8 rounded-full ring ring-primary">
              <img src={profile?.pictureUrl} />
            </div>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
