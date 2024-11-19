import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import RoyalForm from "~/components/Events/RoyalForm";
// import { useRef } from "react";
// import { client } from "../../../sanity/lib/client";

export default function RegisterForm() {
  const { profile } = useLine();
  const { query } = useRouter();

  // const ref = useRef<HTMLInputElement>(null);

  // const handleDelete = async () => {
  //   const id = ref.current?.value;

  //   client.delete(id!).then(() => alert("done!"));
  // };

  return (
    <div className="h-full max-h-[90vh] overflow-scroll p-6">
      {/* <div>
        <input type="text" className="input" ref={ref} />
        <button className="btn btn-primary" onClick={handleDelete}>
          Delete
        </button>
      </div> */}
      <RoyalForm
        userId={profile ? profile.userId : ""}
        eventId={"dc6428a0-814c-430c-878a-42e8365adbb0"}
        startAt={query.date as string}
        name={query.name as string}
      />
    </div>
  );
}
