import { EventForm } from "~/components/Events/Form";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";

export default function RegisterForm() {
  const { loggedIn, profile } = useLine();
  const { query } = useRouter();

  console.log(query);

  return (
    <div className="p-3">
      <EventForm
        userId={profile?.userId!}
        eventId={+query.eventId!}
        name={query.name as string}
      />
    </div>
  );
}
