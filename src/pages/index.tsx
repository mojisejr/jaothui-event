import Head from "next/head";
import { motion } from "framer-motion";
import { useLine } from "~/context/lineContext";
import Link from "next/link";

export default function Home() {
  const { loggedIn, login } = useLine();

  return (
    <>
      <Head>
        <title>Jaothui Event</title>
        <meta name="description" content="Jaothui Event App" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="h-full px-4 py-2">
        <div className="py-3">
          <div>
            <h3 className="font-semibold text-secondary">
              ยินดีต้อนรับเข้าสู่ระบบ
            </h3>
            <motion.h1
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1.3, ease: "easeInOut" }}
              className="font-prompt text-[38px] font-semibold text-primary"
            >
              JAOTHUI EVENT
            </motion.h1>
          </div>
          <p className="py-6 pr-6 text-secondary">
            ระบบ Jaothui Event ยกระดับการประกวด ยกระดับควายไทย
            ด้วยระบบกิจกรรมการประกวดดิจิตอล สะดวกรวดเร็วฉับไว มีประสิทธิภาพ
          </p>

          <div className="flex gap-2">
            {!loggedIn ? (
              <button
                onClick={() => login()}
                className="btn btn-primary min-w-[150px] rounded-full shadow"
              >
                เช้าสู่ระบบ
              </button>
            ) : (
              <Link
                href="/profile"
                className="btn btn-primary min-w-[150px] rounded-full shadow"
              >
                เริ่มกันเลย
              </Link>
            )}
          </div>
        </div>
        <div className="flex w-full justify-center py-6">
          <motion.div
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 1.5,
              type: "spring",
              ease: "easeInOut",
            }}
            className="w-full max-w-[300px]"
          >
            <img
              src="/images/phone1.png"
              alt="phone with thui logo"
              className="w-full"
            />
          </motion.div>
        </div>
      </main>
    </>
  );
}
