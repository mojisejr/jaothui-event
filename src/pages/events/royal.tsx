import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import RoyalForm from "~/components/Events/RoyalForm";

export default function RegisterForm() {
  const { profile } = useLine();
  const { query } = useRouter();

  // Note: This page is now a fallback route for royal events.
  // The primary routing is handled via eventType query param in [eventId].tsx
  // eventId should come from query params when properly redirected
  const eventId = (query.eventId as string) ?? "";

  return (
    <div className="h-full max-h-[90vh] overflow-scroll p-6">
      <RoyalForm
        userId={profile ? profile.userId : ""}
        eventId={eventId}
        _startAt={query.date as string}
        deadline={query.deadline as string}
        name={query.name as string}
      />
    </div>
  );
}
