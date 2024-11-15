import EventCard from "../Events/Card";
import { api } from "~/utils/api";
export default function EventTab() {
  const { data, isLoading } = api.event.getById.useQuery(
    "dc6428a0-814c-430c-878a-42e8365adbb0",
  );

  return (
    <div className="p-2 text-xl text-primary">
      <div className="flex w-full justify-center">
        {isLoading ? (
          <div className="text-white">Loading..</div>
        ) : (
          <EventCard
            key={0}
            imageUrl={data?.imageUrl!}
            title={data?.name!}
            date={new Date(data?.eventAt!)}
            eventId={"royal"}
            metadata={[]}
          />
        )}
        {/* <button className="btn btn-primary">กำลังพัฒนา</button> */}
      </div>
    </div>
  );
}
