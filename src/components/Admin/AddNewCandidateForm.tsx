import { useForm } from "react-hook-form";
import { uploadCandidate } from "~/server/services/upload.service";
import { api } from "~/utils/api";
import { toast } from "react-toastify";
import { useEffect } from "react";

type InputType = {
  microchip: string;
  name: string;
  image: FileList;
};

export function NewCandidateForm() {
  const { register, handleSubmit, reset } = useForm<InputType>();
  const { data: selectedEvent } = api.votes.getSelectedEvent.useQuery();
  const {
    mutate: addNewCandidate,
    isLoading: adding,
    isError: addingError,
    isSuccess: addingOK,
  } = api.votes.addCandidate.useMutation();
  const {
    mutate: importCandidates,
    isLoading: importing,
    isSuccess: imported,
  } = api.votes.importCandidates.useMutation();

  const onSubmit = handleSubmit(async (data) => {
    const imageUrl = await uploadCandidate(data.image[0]!, data.microchip);

    addNewCandidate({
      microchip: data.microchip,
      name: data.name,
      eventId: selectedEvent == undefined ? 0 : selectedEvent.id,
      imageUrl: imageUrl!,
    });
  });

  useEffect(() => {
    if (addingOK) {
      toast.success("เพิ่มข้อมูลสำเร็จ");
      reset();
    }

    if (addingError) {
      toast.error("เพิ่มข้อมูลไม่สำเร็จ");
      reset();
    }

    if (imported) {
      toast.success("ดึงข้อมูลเรียบร้อย");
      reset();
    }
  }, [addingOK, addingError, imported]);

  return (
    <>
      <form onSubmit={onSubmit}>
        <div className="form-control">
          <label className="label label-text">microchip</label>
          <input
            type="text"
            disabled={adding || !selectedEvent}
            {...register("name", { required: true })}
            className="input input-bordered input-primary input-sm w-full rounded-full"
          ></input>
        </div>
        <div className="form-control">
          <label className="label label-text">ชื่อควาย</label>
          <input
            type="text"
            disabled={adding || !selectedEvent}
            {...register("microchip", { required: true })}
            className="input input-bordered input-primary input-sm w-full rounded-full"
          ></input>
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">รูปควาย</label>
          <input
            type="file"
            disabled={adding || !selectedEvent}
            {...register("image", { required: true })}
            required
            accept="image/png,image/jpg,image/jpeg"
            className="file-input file-input-bordered file-input-primary file-input-sm rounded-full text-primary"
          />
        </div>
        <div className="form-control mt-4">
          <button
            disabled={adding || !selectedEvent}
            type="submit"
            className="btn-primart btn btn-sm w-full rounded-full"
          >
            {!adding ? "เพิ่ม" : "กำลังบันทึก"}
          </button>
        </div>
      </form>
      <div className="mt-6">
        <p>
          ปุ่มด้านล่างนี้เป็นปุ่มสำหรับดึงข้อมูลจากใบสมัครของงานที่จะทำการโหวต
          ดังนั้นระวังข้อมูลซ้ำ
        </p>
        <button
          type="button"
          disabled={importing}
          onClick={() =>
            void importCandidates({
              eventId: selectedEvent == undefined ? 0 : selectedEvent.id,
            })
          }
          className="btn btn-error rounded-full"
        >
          {importing ? "กำลังดึงข้อมูล" : "ดึงข้อมูลจากใบสมัคร"}
        </button>
      </div>
    </>
  );
}
