import EventCard from "~/components/Events/Card";
import Loading1 from "~/components/Shared/Loading1";
import { api } from "~/utils/api";

export default function EventPage() {
  const {
    data: events,
    isLoading,
    isSuccess,
  } = api.event.getAllActive.useQuery();
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
                <EventCard
                  key={e.id}
                  title={e.name}
                  date={e.startAt}
                  eventId={e.id}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
