import { api } from "~/utils/api";
import { getCompetitionPolicy } from "~/server/services/competition-policy";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import FormV3 from "~/components/Events/Formv3";
import RoyalForm from "~/components/Events/RoyalForm";

export default function RegisterForm() {
  const { profile } = useLine();
  const { query } = useRouter();

  const { data: event, isLoading } = api.event.getById.useQuery(
    query.eventId as string,
    { enabled: typeof query.eventId === "string" },
  );
  if (isLoading) return <div className="p-6">กำลังโหลด...</div>;
  if (!event || getCompetitionPolicy(event).publicRegistration !== "open")
    return <div className="p-6">กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้</div>;
  return (
    <div className="h-full max-h-[90vh] overflow-scroll p-6">
      {event.eventType === "royal" ? (
        <RoyalForm
          userId={profile ? profile.userId : ""}
          eventId={event.eventId}
          _startAt={event.eventAt}
          deadline={event.deadline}
          name={event.name}
        />
      ) : (
        <FormV3
          userId={profile ? profile.userId : ""}
          eventId={event.eventId}
          startAt={event.eventAt}
          deadline={event.deadline}
          name={event.name}
          isNational={(query.national as string) == "true"}
          isInHouse={(query.inhouse as string) == "true"}
        />
      )}
    </div>
  );
}
