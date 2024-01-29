import { inHouse, national } from "~/constants/competition-class";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { api } from "~/utils/api";
import { uploadBuffalo } from "~/server/services/upload.service";
import { uploadVaccine } from "~/server/services/upload.service";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Loading1 from "../Shared/Loading1";
import { rules } from "~/constants/rules";
// 1.รุ่นที่จะลงประกวด
// 2.ระบุเพศ
// 3.สี (ดำ,เผือก)
// 4.วันเดือนปีเกิดกระบือ
// 5.หมายเลขประจำตัวสัตว์
// 6.อัปโหลดภาพบัตรประจำตัวสัตว์
// 7.อัปโหลดเอกสารรับรองการรับวัคซีน
// 8.ชื่อ-นามสกุลผู้ส่งเข้าประกวด
// 9.เบอร์โทรศัพท์
export type EventRegisterType = {
  eventId: number;
  userId: string;
  type: string;
  level: string;
  name: string;
  gender: string;
  color: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  imageFile: FileList;
  microchip: string;
  vaccineFile: FileList;
  ownerName: string;
  ownerLastname: string;
  ownerTel: string;
  accept: string[];
};

export function EventForm({
  userId,
  eventId,
  name,
}: {
  userId: string;
  eventId: number;
  name: string;
}) {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [selectedLevel, setSelectedLevel] = useState<string>();
  const { replace } = useRouter();

  const {
    register,
    reset,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventRegisterType>();

  const {
    mutate: registerEvent,
    isLoading: registering,
    isSuccess: registered,
    isError: registerError,
    error: registerErrorObj,
  } = api.registerEvent.register.useMutation();

  useEffect(() => {
    const subscription = watch(({ level }) => {
      setSelectedLevel(level);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (registered) {
      void replace("/success");
    }
    if (registerError) {
      toast.error(registerErrorObj.message);
      setLoading(false);
      // void replace("/error");
    }
  }, [registered, registerError]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    if (data.accept.length < 7) {
      toast.error("คุนต้องยินยอมทุกข้อปฎิบัติ!");
      setLoading(false);
      return;
    }

    const imageFileName = `${data.microchip}-${data.userId}-${data.eventId}-${new Date().getTime().toString()}`;
    const vaccineFileName = `vac_${imageFileName}`;

    const buffaloImageUrl =
      (await uploadBuffalo(data.imageFile[0]!, imageFileName)) ?? "";
    const vaccineImageUrl =
      (await uploadVaccine(data.vaccineFile[0]!, vaccineFileName)) ?? "";

    if (buffaloImageUrl == "" || vaccineFileName == "") {
      toast.error("ิอัพโหลดรูปภาพไม่สำเร็จ");
      setLoading(false);
      return;
    }

    registerEvent({
      ...data,
      userId: userId,
      eventId: eventId,
      imageFile: buffaloImageUrl,
      vaccineFile: vaccineImageUrl,
    });
  });

  return (
    <div className="text-secondary">
      <h2 className="fron-bold text-xl text-primary">{name}</h2>
      <form onSubmit={onSubmit} className="flex max-w-sm flex-col">
        <div className="form-control">
          <label className="label label-text font-semibold">ระดับ</label>
          <select
            disabled={registering || isLoading}
            {...register("level", { required: true })}
            className="select select-bordered select-sm rounded-full border-primary text-primary"
          >
            <option disabled={true} selected>
              เลือก
            </option>
            <option value="ภายในประเทศ">ภายในจังหวัด</option>
            <option value="ระดับประเทศ">ระดับประเทศ</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">
            รุ่นที่จะประกวด
          </label>
          <select
            disabled={registering || isLoading || selectedLevel == undefined}
            className="select select-bordered select-sm rounded-full border-primary text-primary"
            {...register("type", { required: true })}
          >
            <option disabled={true} selected>
              เลือก
            </option>
            {selectedLevel == "ภายในประเทศ" ? (
              <>
                {inHouse.map((ih) => (
                  <option key={ih.id} value={ih.title}>
                    {ih.title}
                  </option>
                ))}
              </>
            ) : (
              <>
                {national.map((n) => (
                  <option key={n.id} value={n.title}>
                    {n.title}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div className="form-control">
          <label className="label label-text font-semibold ">
            ชื่อของกระบือ
          </label>
          <input
            type="text"
            disabled={registering || isLoading}
            {...register("name", { required: true })}
            required
            className="input input-sm rounded-full border-primary text-primary"
          />
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">เพศของกระบือ</label>
          <select
            disabled={registering || isLoading}
            {...register("gender", { required: true })}
            className="select select-bordered select-sm rounded-full border-primary text-primary"
          >
            <option disabled={true} selected>
              เลือก
            </option>
            <option value="เพศผู้">เพศผู้</option>
            <option value="เพศเมีย">เพศเมีย</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">สีของกระบือ</label>
          <select
            disabled={registering || isLoading}
            {...register("color", { required: true })}
            className="select select-bordered select-sm rounded-full border-primary text-primary"
          >
            <option disabled={true} selected>
              เลือก
            </option>
            <option value="ดำ">สีดำ</option>
            <option value="เผือก">สีเผือก</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">
            วัน เดือน ปี เกิด
          </label>
          <div className="flex justify-evenly gap-2">
            <input
              type="number"
              placeholder="วัน"
              disabled={registering || isLoading}
              {...register("birthDay", { required: true })}
              required
              className="input input-bordered input-primary input-sm w-16 rounded-full text-primary"
            ></input>
            <select
              className="select select-sm w-full rounded-full border-primary text-primary"
              required
              disabled={registering || isLoading}
              {...register("birthMonth", { required: true })}
            >
              <option disabled selected>
                เดือน
              </option>
              <option value={1}>มกราคม</option>
              <option value={2}>กุมพาพันธ์</option>
              <option value={3}>มีนาคม</option>
              <option value={4}>เมษายน</option>
              <option value={5}>พฤษภาคม</option>
              <option value={6}>มิถุนายน</option>
              <option value={7}>กรกฎาคม</option>
              <option value={8}>สิงหาคม</option>
              <option value={9}>กันยายน</option>
              <option value={10}>ตุลาคม</option>
              <option value={11}>พฤศจิกายน</option>
              <option value={12}>ธันวาคม</option>
            </select>
            <input
              type="number"
              {...register("birthYear", { required: true })}
              placeholder="พ.ศ."
              required
              disabled={registering || isLoading}
              className="input input-bordered input-primary input-sm w-24 rounded-full text-primary"
            ></input>
          </div>
          {/* <Datepicker /> */}
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold ">
            หมายเลขประจำตัวสัตว์
          </label>
          <input
            type="text"
            disabled={registering || isLoading}
            {...register("microchip", { required: true })}
            required
            className="input input-sm rounded-full border-primary text-primary"
          />
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">
            ภาพบัตรประจำตัวสัตว์
          </label>
          <input
            type="file"
            disabled={registering || isLoading}
            {...register("imageFile", { required: true })}
            required
            accept="image/png,image/jpg,image/jpeg"
            className="file-input file-input-bordered file-input-primary file-input-sm rounded-full text-primary"
          />
        </div>

        <div className="form-control">
          <label className="label label-text font-semibold">
            เอกสารรับรองการฉีดวัคซีน
          </label>
          <input
            type="file"
            disabled={registering || isLoading}
            {...register("vaccineFile", { required: true })}
            required
            accept="image/png,image/jpg,image/jpeg"
            className="file-input file-input-bordered file-input-primary file-input-sm rounded-full text-primary"
          />
        </div>

        <div className="form-control">
          <label className="label label-text font-semibold">
            ชื่อ - นามสกุล ผู้ส่งเข้าประกวด
          </label>
          <div className="flex flex-col justify-evenly gap-2">
            <input
              required
              type="text"
              disabled={registering || isLoading}
              {...register("ownerName", { required: true })}
              className="input input-bordered input-sm rounded-full border-primary text-primary"
            />
            <input
              required
              type="text"
              disabled={registering || isLoading}
              {...register("ownerLastname", { required: true })}
              className="input input-bordered input-sm rounded-full border-primary text-primary"
            />
          </div>
        </div>

        <div className="form-control">
          <label className="label label-text font-semibold">โทรศัพท์</label>
          <input
            required
            type="text"
            disabled={registering || isLoading}
            {...register("ownerTel", { required: true })}
            className="input input-bordered input-sm rounded-full border-primary text-primary"
          />
        </div>

        <div className="form-group my-2 rounded-xl border-[1px] border-primary p-2 text-secondary">
          <h3 className="text-xl font-semibold">กรุณายินยอมข้อตกลง</h3>
          {rules
            ? rules.map((rule, index) => (
                <div className="form-control p-1" key={index}>
                  <label className="label grid cursor-pointer grid-cols-3">
                    <input
                      type="checkbox"
                      className="checkbox-primary checkbox col-span-1"
                      {...register("accept")}
                    />
                    <span className="label-text col-span-2">{rule}</span>
                  </label>
                </div>
              ))
            : null}
        </div>

        <div className="form-control flex flex-row justify-center gap-2">
          <button
            disabled={registering || isLoading}
            type="submit"
            className="btn btn-primary rounded-full"
          >
            {registering || isLoading ? <Loading1 /> : "บันทึก"}
          </button>
          <button
            onClick={() => reset()}
            disabled={registering || isLoading}
            className="btn btn-outline btn-error rounded-full"
          >
            {registering || isLoading ? <Loading1 /> : "ล้าง"}
          </button>
        </div>
      </form>
    </div>
  );
}
