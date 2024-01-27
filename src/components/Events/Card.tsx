import dayjs from "dayjs";
import Link from "next/link";
interface EventCardProps {
  date: Date;
  title: string;
  eventId: number;
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

export default function EventCard({ date, title, eventId }: EventCardProps) {
  const day = dayjs(date).date();
  const month = dayjs(date).month();

  return (
    <Link
      href={`/events/${eventId}?name=${title}`}
      className="bg-accent text-primary-content relative grid min-h-[100px] grid-cols-3 overflow-hidden rounded-md px-5 py-6 shadow"
    >
      <div className="relative">
        <div className="cal-span-1 bg-error absolute -left-2 -top-6 flex h-[80px] w-[60px] flex-col items-center justify-center rounded-b-md shadow-sm">
          <div className="text-xl font-bold">{day}</div>
          <div className="text-sm font-bold">{Month[month]}</div>
        </div>
      </div>
      <div className="col-span-2">{title}</div>
      <div className="cal-span-1 bg-primary absolute -right-6 top-0 flex h-[100px] w-[30px] flex-col items-center justify-center"></div>
    </Link>
  );
}
