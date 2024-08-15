import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import FormV3 from "~/components/Events/Formv3";

export default function RegisterForm() {
  const { profile } = useLine();
  const { query } = useRouter();

  return (
    <div className="h-full max-h-[90vh] overflow-scroll p-6">
      <FormV3
        userId={profile ? profile.userId : ""}
        eventId={query.eventId! as string}
        startAt={query.date as string}
        name={query.name as string}
      />
    </div>
  );
}
