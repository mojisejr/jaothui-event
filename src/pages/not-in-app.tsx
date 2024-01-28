import { IoMdCloseCircle } from "react-icons/io";

export default function ProfileErrorPage() {
  return (
    <div className="mt-10 flex h-[30vh] w-full justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* <IoMdCloseCircle size={120} className="text-error" /> */}
        <img src="/images/qr.png" alt="qr code" />
        <div className="text-2xl font-bold text-error">
          เปิดผ่าน Line OA เท่านั้น
        </div>
      </div>
    </div>
  );
}
