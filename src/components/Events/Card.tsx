import dayjs from "dayjs";
import Link from "next/link";
import { useLine } from "~/context/lineContext";
interface EventCardProps {
  date: Date;
  title: string;
  eventId: string;
  imageUrl: string;
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
}: EventCardProps) {
  const { loggedIn, login } = useLine();
  return (
    <div className="event-card-container flex w-full max-w-[300px] flex-col items-center gap-2">
      <div className="event-image-container flex flex-col">
        <img src={imageUrl} />
        <caption className="font-thin text-secondary text-slate-400">
          รายละเอียดการประกวด
        </caption>
      </div>
      {loggedIn ? (
        <Link
          className="btn btn-primary btn-sm rounded-full"
          href={`/events/${eventId}?name=${title}&date=${dayjs(date).format("MM/DD/YYYY")}`}
        >
          สมัครเข้าร่วมประกวด
        </Link>
      ) : (
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
