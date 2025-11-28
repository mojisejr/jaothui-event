import EventCard from "../Events/Card";
import { api } from "~/utils/api";
import type { Event } from "~/interfaces/Event";

export default function EventTab() {
  // Fetch all events and filter for royal events
  const { data: events, isLoading } = api.event.getAllActive.useQuery();
  
  // Filter only royal events
  const royalEvents = events?.filter((e: Event) => e.eventType === "royal") ?? [];

  return (
    <div className="p-2 text-xl text-primary">
      <div className="flex w-full flex-wrap justify-center gap-4">
        {isLoading ? (
          <div className="text-white">Loading..</div>
        ) : royalEvents.length > 0 ? (
          royalEvents.map((event: Event) => (
            <EventCard
              key={event.eventId}
              imageUrl={event.imageUrl!}
              title={event.name!}
              date={new Date(event.eventAt!)}
              deadline={new Date(event.deadline!)}
              eventId={event.eventId}
              metadata={event.metadata ?? []}
              eventType={event.eventType}
            />
          ))
        ) : (
          <div className="text-white">ไม่พบรายการประกวดพระราชทาน</div>
        )}
      </div>
    </div>
  );
}
