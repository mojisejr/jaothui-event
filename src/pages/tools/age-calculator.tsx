import React, { useState } from "react";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";

type Input = {
  start: Date;
  end: Date;
};

const AgeCalculator = () => {
  const { register, handleSubmit, reset } = useForm<Input>();
  const [calculated, setCalculated] = useState<number>(0);

  const onSubmit = handleSubmit(async (data, event) => {
    setCalculated(0);
    event?.preventDefault();
    const diff = dayjs(data.end).diff(data.start, "month");
    if (diff < 0) {
      alert("ไม่สามารถคำนวนได้ ตรวจสอบข้อมูลอีกครั้ง");
      setCalculated(0);
    }
    reset();
    setCalculated(diff);
  });

  return (
    <div className="mt-10 flex min-h-screen w-full flex-col items-center gap-4 p-3">
      {/** Input */}
      <div className="h-full min-w-[300px] max-w-md rounded-xl bg-white bg-opacity-30 p-4 text-white">
        <h1 className="py-2 text-xl">เครื่องคำนวนอายุควาย</h1>
        <form className="grid grid-cols-1 gap-2" onSubmit={onSubmit}>
          <div className="form-control">
            <label className="label label-text">วันเกิด</label>
            <input
              type="date"
              className="input input-bordered input-primary text-black"
              required
              {...register("start", { required: true })}
            ></input>
          </div>
          <div className="form-control">
            <label className="label label-text">วันแข่งขัน</label>
            <input
              type="date"
              className="input input-bordered input-primary text-black"
              required
              {...register("end", { required: true })}
            ></input>
          </div>
          <button type="submit" className="btn btn-primary w-full">
            คำนวน
          </button>
        </form>
      </div>
      {/** Result */}
      {calculated > 0 ? (
        <div className="w-full min-w-[300px] max-w-md rounded-xl bg-primary p-4 text-center text-xl font-bold">
          อายุ {calculated} เดือน
        </div>
      ) : null}
    </div>
  );
};

export default AgeCalculator;
