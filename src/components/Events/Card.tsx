import dayjs from "dayjs";
import Link from "next/link";
import { useLine } from "~/context/lineContext";
interface EventCardProps {
  date: Date;
  title: string;
  eventId: string;
  imageUrl: string;
  deadline: Date;
  metadata: string[] | null;
}

const Month = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export default function EventCard({
  date,
  title,
  eventId,
  imageUrl,
  deadline,
  metadata,
}: EventCardProps) {
  const { loggedIn, login } = useLine();
  const national = metadata != null ? metadata?.includes("national") : true;
  const inhouse = metadata != null ? metadata?.includes("inhouse") : true;

  return (
    <div className="event-card-container flex w-full max-w-[300px] flex-col items-center gap-2">
      <div className="event-image-container flex flex-col">
        <>
          {loggedIn ? (
            <Link
              href={`/events/${eventId}?name=${title}&deadline=${dayjs(deadline).format("MM/DD/YYYY")}&date=${dayjs(date).format("MM/DD/YYYY")}&national=${national}&inhouse=${inhouse}`}
            >
              <img src={imageUrl} />
            </Link>
          ) : (
            <img src={imageUrl} />
          )}
        </>

        {/* <caption className="font-thin text-secondary text-slate-400">
          รายละเอียดการประกวด
        </caption> */}
      </div>
      {loggedIn ? (
        <div className="text-white">
          <div className="text-center text-xs text-slate-300">
            คลิกที่รูปเพื่อสมัครงานประกวด
          </div>
          <h3>{title}</h3>
        </div>
      ) : (
        // <Link
        //   className="btn btn-primary btn-sm rounded-full"
        //   href={`/events/${eventId}?name=${title}&date=${dayjs(date).format("MM/DD/YYYY")}&national=${national}&inhouse=${inhouse}`}
        // >
        //   สมัครเข้าร่วมประกวด
        // </Link>
        <button
          onClick={() => login()}
          className="btn btn-primary rounded-full"
        >
          เข้าสู่ระบบเพื่อสมัคร
        </button>
      )}
    </div>
  );
}
