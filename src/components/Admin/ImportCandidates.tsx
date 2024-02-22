import { api } from "~/utils/api";
import { clsx } from "clsx";
export function ImportCandidatesButton() {
  const { data: selectedEvent } = api.votes.getSelectedEvent.useQuery();
  const {
    data: imported,
    isLoading: importing,
    mutate: importCandidates,
  } = api.votes.importCandidates.useMutation();
  return (
    <button
      disabled={
        selectedEvent == null || selectedEvent == undefined || importing
      }
      onClick={() =>
        importCandidates({
          eventId: selectedEvent == undefined ? 0 : selectedEvent.id,
        })
      }
      className={clsx("btn btn-primary btn-sm", {
        "text-gray-200 opacity-60":
          selectedEvent == null || selectedEvent == undefined,
      })}
    >
      {importing ? "กำลังโหลดข้อมูล" : "โหลดข้อมูลควายจากการสมัคร"}
    </button>
  );
}
