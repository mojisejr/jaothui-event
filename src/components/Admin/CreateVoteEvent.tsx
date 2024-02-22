import { api } from "~/utils/api";
import { useForm } from "react-hook-form";

type InputForm = {
  eventId: string;
};

export function CreateVoteEvent() {
  const { register, reset, handleSubmit } = useForm<InputForm>();

  const { data: selectedEvent } = api.votes.getSelectedEvent.useQuery();

  const { data: activeEvent, isLoading: eventLoading } =
    api.event.getAllActive.useQuery();

  const { isLoading: creating, mutate: createVoteEvent } =
    api.votes.createVoteEvent.useMutation();

  const onSubmit = handleSubmit(async (data) => {
    const selected = activeEvent?.find((event) => event.id === +data.eventId);
    createVoteEvent({
      id: selected == undefined ? 0 : selected.id,
      name: selected == undefined ? "" : selected.name,
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="form-control">
        <label className="label label-text">งานที่จะโหวต</label>
        <select
          disabled={creating}
          {...register("eventId", { required: true })}
          className="select select-sm rounded-full"
        >
          <option selected disabled>
            {selectedEvent != null ? selectedEvent.name : "เลือก"}
          </option>
          {selectedEvent == null
            ? activeEvent?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))
            : null}
        </select>
      </div>
      <button
        disabled={
          creating || activeEvent == undefined
            ? true
            : activeEvent.length <= 0 || selectedEvent != null
        }
        type="submit"
        className="btn btn-primary btn-sm w-full rounded-full"
      >
        {!creating ? "เลือก" : "กำลังบันทึก"}
      </button>
    </form>
  );
}
