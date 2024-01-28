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
      <main className="max-h-[90vh] px-4 py-2">
        <div className="py-3">
          <div>
            <h3 className="font-semibold">ยินดีต้อนรับเข้าสูระบบ</h3>
            <motion.h1
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1.3, ease: "easeInOut" }}
              className="text-[48px] font-semibold text-primary"
            >
              Jaothui Event
            </motion.h1>
          </div>
          <p className="py-6 pr-6 text-slate-800">
            ระบบ Jaothui Event ยกระดับการประกวด ยกระดับควายไทย
            ด้วยระบบกิจกรรมการประกวด ดิจิตอล สะดวกรวดเร็วฉับไว มีประสิทธิภาพ
          </p>

          <div className="flex gap-2">
            {!loggedIn ? (
              <button
                onClick={() => login()}
                className="btn btn-primary shadow"
              >
                เช้าสู่ระบบ
              </button>
            ) : (
              <Link href="/profile" className="btn btn-primary shadow">
                เร่ิมกันเลย
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
            className="mockup-phone w-[300px] border-primary border-opacity-80 shadow-[rgba(0,_0,_0,_0.2)_0px_60px_40px_-7px]"
          >
            <div className="camera"></div>
            <div className="display">
              <div className="artboard phone-1 relative bg-slate-200">
                <div className="absolute left-0 top-0">
                  <img src="/images/thuiLogo.png" />
                  <div className="p-4">
                    <div className="text-[50px]">Jaothui</div>
                    <div className="text-[50px]">Events</div>
                    <div className="text-[50px]">System</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
