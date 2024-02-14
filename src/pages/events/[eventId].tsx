import { EventForm } from "~/components/Events/Form";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import { EventForm2 } from "~/components/Events/Formv2";

export default function RegisterForm() {
  const { profile } = useLine();
  const { query } = useRouter();

  return (
    <div className="h-full max-h-[90vh] overflow-scroll p-6">
      {+query.eventId! && +query.eventId! == 1 ? (
        <EventForm
          userId={profile ? profile.userId : ""}
          eventId={+query.eventId!}
          name={query.name as string}
        />
      ) : (
        <EventForm2
          userId={profile ? profile.userId : ""}
          eventId={+query.eventId!}
          name={query.name as string}
        />
      )}
    </div>
  );
}
