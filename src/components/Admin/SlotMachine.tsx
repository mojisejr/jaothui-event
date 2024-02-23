import { motion, useAnimationControls } from "framer-motion";
import { useState } from "react";
import { FaCaretRight } from "react-icons/fa";
import { FaCaretLeft } from "react-icons/fa6";
import Image from "next/image";
import { api } from "~/utils/api";

export default function SlotMachine() {
  const { data: voter, isLoading } = api.votes.getVoters.useQuery();
  const [variants, setVariants] = useState<any>();
  const controller = useAnimationControls();

  const shuffle = (array: number[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j]!, array[i]!];
    }
    return array;
  };

  function action() {
    const positions = shuffle(voter?.map((vote, index) => -90 * index)!);
    const variants = {
      roll: {
        marginTop: positions,
      },
    };

    setVariants(variants);
    controller.start("roll");
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center gap-6">
      <Image
        className="w-48"
        src="/images/thuiLogo.png"
        width={1000}
        height={700}
        alt="logo"
      />
      <div className="relative relative h-[80px] min-w-[300px] overflow-hidden bg-slate-800">
        <div className="absolute -left-[25px] top-[5px] z-[10]">
          <FaCaretRight size={70} className="text-white drop-shadow-xl" />
        </div>
        <div className="absolute -right-[30px] top-[5px] z-[10]">
          <FaCaretLeft size={70} className="text-white drop-shadow-xl" />
        </div>
        <motion.div
          variants={variants}
          animate={controller}
          transition={{
            delay: 0.5,
            duration: 10,
            ease: "easeInOut",
            type: "spring",
            stiffness: 100,
          }}
          className={`absolute flex w-full flex-col gap-[10px]`}
        >
          {voter?.map((voter, index) => (
            <motion.div
              key={index}
              className={`flex h-[80px] items-center justify-center bg-gradient-to-br from-yellow-300 via-primary to-yellow-300`}
            >
              <div className="text-xl">{voter?.name}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
      <div className="flex items-center justify-center">
        <button
          disabled={voter?.length! <= 0}
          className="btn btn-circle btn-primary btn-lg disabled:text-slate-200"
          onClick={() => action()}
        >
          {!isLoading ? "สุ่ม" : "กำลังโหลด.."}
        </button>
      </div>
    </div>
  );
}
