import { api } from "~/utils/api";
import { useForm } from "react-hook-form";

type InputForm = {
  eventName: string;
};

export function CreateVoteEvent() {
  const { register, reset, handleSubmit } = useForm<InputForm>();

  const { isLoading: creating, mutate: createVoteEvent } =
    api.votes.newVoteEvent.useMutation();

  const onSubmit = handleSubmit(async (data, event) => {
    event?.preventDefault();
    // const selected = activeEvent?.find((event) => event.id === +data.eventId);
    createVoteEvent({
      eventName: data.eventName,
    });
  });

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="form-control">
          <label className="label label-text">ชื่องานที่จะโหวต</label>
          <input
            type="text"
            className="input input-sm rounded-full"
            {...register("eventName", { required: true })}
          ></input>
          {/* <select
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
          </select> */}
        </div>
        <button
          disabled={creating}
          type="submit"
          className="btn btn-primary btn-sm w-full rounded-full"
        >
          {!creating ? "บันทึก" : "กำลังบันทึก"}
        </button>
      </form>
      <div className="rounded-xl border-[1px] border-primary p-2">
        <div className="underline">ขั้นตอนการใช้งานระบบ</div>
        <ul>
          <li className="text-sm">- เลือกกิจกรรมที่จะให้โหวตใน tab นี้</li>
          <li className="text-sm">
            - กดเพิ่มข้อมูลควายที่ tab ที่สอง user ก็จะโหวตได้
          </li>
          <li className="text-sm">
            - ถ้าต้องการจับรางวัล ให้ไปที่ reward แล้วกดปุ่ม roll
          </li>
          <li className="text-sm">
            - ถ้ากดปุ่ม reset ที่ tab ควบคุมจะ reset data ทั้งหมด
            แบบไม่เซฟข้อมูล
          </li>
        </ul>
      </div>
    </>
  );
}
