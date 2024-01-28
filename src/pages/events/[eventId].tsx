import { EventForm } from "~/components/Events/Form";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";

export default function RegisterForm() {
  const { profile } = useLine();
  const { query } = useRouter();

  return (
    <div className="p-6">
      <EventForm
        userId={profile ? profile.userId : ""}
        eventId={+query.eventId!}
        name={query.name as string}
      />
    </div>
  );
}
