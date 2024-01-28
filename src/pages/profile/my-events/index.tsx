import MyEventCard from "~/components/MyEvents/Card";
import Loading1 from "~/components/Shared/Loading1";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
export default function MyEventPage() {
  const { profile } = useLine();
  const { data: events, isLoading } =
    api.registerEvent.getAllRegisteredBy.useQuery({
      userId: profile ? profile.userId : "",
    });

  console.log(events);
  return (
    <div>
      {isLoading ? (
        <div className="flex h-[50vh] justify-center">
          <Loading1 />
        </div>
      ) : (
        <div className="flex max-h-[85vh] w-full flex-col gap-2 overflow-y-scroll p-4">
          {events && events.length <= 0 ? (
            <div>Empty</div>
          ) : (
            <>
              {events?.map((e) => (
                <MyEventCard
                  key={e.id}
                  id={e.id}
                  title={e.event.name}
                  date={e.event.startAt}
                  eventId={e.id}
                  microchip={e.microchip}
                  ownerName={e.ownerName}
                  imageUrl={e.imageUrl}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
