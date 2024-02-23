import { api } from "~/utils/api";
export default function VoteSetting() {
  const { mutate: reset } = api.votes.reset.useMutation();
  return (
    <div className="flex w-full flex-col gap-6">
      <button onClick={() => reset()} className="btn btn-error">
        Reset Data
      </button>
    </div>
  );
}
