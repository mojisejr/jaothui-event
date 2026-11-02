import { useRouter } from "next/router";
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
  registrationDeadline?: Date;
  eventType?: "normal" | "royal";
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
  registrationDeadline,
  eventType,
}: EventCardProps) {
  const { loggedIn } = useLine();
  const router = useRouter();
  const national = metadata != null ? metadata?.includes("national") : true;
  const inhouse = metadata != null ? metadata?.includes("inhouse") : true;

  // Use deadline (buffaloAgeDeadline) as first priority, fall back to registrationDeadline
  const effectiveDeadline = deadline ?? registrationDeadline;

  return (
    <div className="event-card-container flex w-full max-w-[300px] flex-col items-center gap-2">
      <div className="event-image-container relative flex flex-col">
        {eventType === "royal" && (
          <span className="badge badge-primary absolute left-2 top-2 gap-1 text-xs">
            👑 Royal
          </span>
        )}
        <>
          {loggedIn ? (
            <Link
              href={`/events/${eventId}?name=${title}&deadline=${dayjs(effectiveDeadline).format("MM/DD/YYYY")}&date=${dayjs(date).format("MM/DD/YYYY")}&national=${national}&inhouse=${inhouse}&eventType=${eventType ?? "normal"}`}
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
          onClick={() => {
            void router.push(
              `/events/${eventId}?national=${national}&inhouse=${inhouse}`,
            );
          }}
          className="btn btn-primary rounded-full"
        >
          เข้าสู่ระบบเพื่อสมัคร
        </button>
      )}
    </div>
  );
}
