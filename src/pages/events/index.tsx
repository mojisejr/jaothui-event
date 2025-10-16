import { FaAddressCard } from "react-icons/fa6";
import EventCard from "~/components/Events/Card";
import Loading1 from "~/components/Shared/Loading1";
import { api } from "~/utils/api";

export default function EventPage() {
  const { data: events, isLoading } = api.event.getRegistrationOpen.useQuery();
  // Previously used: api.event.getAllActive.useQuery();
  // const { data: events, isLoading } = api.event.getAll.useQuery();

  return (
    <div>
      <h3 className="text-center text-xl font-bold text-secondary">
        รายการประกวดควาย
      </h3>
      {isLoading ? (
        <div className="flex h-[50vh] justify-center">
          <Loading1 />
        </div>
      ) : (
        <div className="flex h-screen w-full flex-col items-center gap-2 overflow-y-scroll p-4">
          {events && events.length <= 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center text-secondary">
              <FaAddressCard size={65} className="text-primary" />
              <p className="text-2xl">ไม่มีข้อมูล</p>
            </div>
          ) : (
            <>
              <h1>รายการประกวด</h1>
              {/* <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"> */}
              <div className="grid grid-cols-2 gap-4">
                {events?.map((e) => (
                  <EventCard
                    key={e.eventId}
                    imageUrl={e.imageUrl!}
                    title={e.name}
                    date={new Date(e.endAt)}
                    deadline={new Date(e.deadline)}
                    registrationDeadline={e.registrationDeadline ? new Date(e.registrationDeadline) : undefined}
                    eventId={e.eventId}
                    metadata={e.metadata}
                  />
                ))}
              </div>

              {/* <EventCard
                imageUrl={
                  "https://cdn.sanity.io/images/q38mtihr/production/94642e3b93f88b40acc69d27245e89a91afcea6e-1080x1350.jpg"
                }
                title={
                  "ประกวดกระบือปลักไทยชิงถ้วยพระราชทาน งานวันอนุรักษ์และพัฒนากระบือปลักไทย ประจำปี๒๕๖๘"
                }
                date={new Date()}
                eventId={"royal"}
                metadata={[]}
              /> */}
            </>
          )}
        </div>
      )}
    </div>
  );
}
