import MyEventCard from "~/components/MyEvents/Card";
import Loading1 from "~/components/Shared/Loading1";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
import { FaAddressCard } from "react-icons/fa";
import Link from "next/link";

export default function MyEventPage() {
  const { profile } = useLine();
  const { data: events, isLoading } =
    api.registerEvent.getAllRegisteredBy.useQuery({
      userId: profile ? profile.userId : "",
    });

  console.log(events);
  return (
    <div className="flex h-screen w-full flex-col items-center gap-2 overflow-y-scroll">
      <h3 className="text-center text-xl font-bold text-secondary">
        ประวัติการลงประกวดควาย
      </h3>
      {isLoading ? (
        <div className="flex h-[50vh] justify-center">
          <Loading1 />
        </div>
      ) : (
        <div className="flex h-[95vh] w-full flex-col gap-2 overflow-y-scroll p-4">
          {events && events.length <= 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center text-secondary">
              <FaAddressCard size={65} className="text-primary" />
              <p className="text-2xl">ไม่มีข้อมูล</p>
              <Link
                className="btn btn-primary mt-6 rounded-full"
                href="/events"
              >
                ไปสมัคร
              </Link>
            </div>
          ) : (
            <>
              {events?.map((e) => (
                <MyEventCard
                  key={e.id}
                  title={e.event.name}
                  date={e.event.eventAt}
                  eventId={e.id}
                  microchip={e.microchip}
                  ownerName={e.ownerName}
                  buffaloName={e.name}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
