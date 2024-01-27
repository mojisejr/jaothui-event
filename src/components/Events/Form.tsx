import { CompetitionClass } from "~/constants/CompetitionClass";
import Link from "next/link";
import { useForm } from "react-hook-form";
// 1.รุ่นที่จะลงประกวด
// 2.ระบุเพศ
// 3.สี (ดำ,เผือก)
// 4.วันเดือนปีเกิดกระบือ
// 5.หมายเลขประจำตัวสัตว์
// 6.อัปโหลดภาพบัตรประจำตัวสัตว์
// 7.อัปโหลดเอกสารรับรองการรับวัคซีน
// 8.ชื่อ-นามสกุลผู้ส่งเข้าประกวด
// 9.เบอร์โทรศัพท์
type EventRegisterType = {
  eventId: number;
  userId: string;
  type: string;
  level: string;
  gender: string;
  color: string;
  birthDay: number;
  birthMonth: string;
  birthYear: number;
  imageFile: string;
  microchip: string;
  vaccineFile: string;
  ownerName: string;
  ownerLastname: string;
  ownerTel: string;
  accept: string;
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
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<EventRegisterType>();
  // async function parseFormData(
  //   formData: FormData,
  //   eventId: number,
  //   userId: string,
  // ) {
  //   const buffaloImageName = `${eventId}_${userId}_${formData.get(
  //     "buffaloMicrochip",
  //   )}_${new Date().getTime().toString()}`;

  //   const buffaloImage = await uploadBuffalo(
  //     formData.get("buffaloImage") as File,
  //     buffaloImageName,
  //   );

  //   const vaccineImage = await uploadVaccine(
  //     formData.get("buffalovcdocImage") as File,
  //     `vcc_${eventId}_${userId}_${formData.get("buffaloMicrochip")}_${new Date()
  //       .getTime()
  //       .toString()}`,
  //   );

  //   if (buffaloImage == null || vaccineImage == null) return null;

  //   return {
  //     eventId,
  //     userId,
  //     type: formData.get("type"),
  //     level: formData.get("level"),
  //     gender: formData.get("buffaloSex"),
  //     color: formData.get("buffaloColor"),
  //     birthday: `${formData.get("birthDay")}/${formData.get(
  //       "birthMonth",
  //     )}/${formData.get("birthYear")}`,
  //     imageUrl: buffaloImage,
  //     microchip: formData.get("buffaloMicrochip"),
  //     vaccineUrl: vaccineImage,
  //     ownerName: `${formData.get("ownerName")} ${formData.get("ownerSurname")}`,
  //     ownerTel: formData.get("tel"),
  //   };
  // }

  // async function submit(formData: FormData) {
  //   "use server";
  //   if (formData.get("accept") === "no") return;
  //   const registerData = await parseFormData(
  //     formData,
  //     1,
  //     "U80a7c64f43e4ca136b5b00bd2ffe6ae0",
  //   );

  //   console.log(registerData);

  //   // redirect()
  // }

  const onSubmit = handleSubmit((data) => {
    console.log(data);
  });

  return (
    <div>
      <h2 className="fron-bold text-primary text-xl">{name}</h2>
      <form onSubmit={onSubmit} className="flex max-w-sm flex-col">
        <div className="form-control">
          <label className="label label-text font-semibold">
            รุ่นที่จะประกวด
          </label>
          <select
            className="select select-bordered border-primary select-sm rounded-full"
            {...register("type", { required: true })}
          >
            <option disabled={true} selected>
              เลือก
            </option>
            {CompetitionClass.map((c) => (
              <option key={c.id} value={c.title}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">ระดับ</label>
          <select
            {...register("level", { required: true })}
            className="select select-bordered border-primary select-sm rounded-full"
          >
            <option disabled={true} selected>
              เลือก
            </option>
            <option value="ภายใน">ภายใน</option>
            <option value="ประเทศ">ประเทศ</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">เพศของกระบือ</label>
          <select
            {...register("gender", { required: true })}
            className="select select-bordered border-primary select-sm rounded-full"
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
            {...register("color", { required: true })}
            className="select select-bordered border-primary select-sm rounded-full"
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
              {...register("birthDay", { required: true })}
              required
              className="input input-primary input-bordered input-sm w-16 rounded-full"
            ></input>
            <select
              className="select select-sm border-primary w-full rounded-full"
              required
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
              className="input input-primary input-bordered input-sm w-24 rounded-full"
            ></input>
          </div>
          {/* <Datepicker /> */}
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">
            หมายเลขประจำตัวสัตว์
          </label>
          <input
            type="text"
            {...register("microchip", { required: true })}
            required
            className="input input-sm border-primary rounded-full"
          />
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">
            ภาพบัตรประจำตัวสัตว์
          </label>
          <input
            type="file"
            {...register("imageFile", { required: true })}
            required
            accept="image/png,image/jpg,image/jpeg"
            className="file-input file-input-primary file-input-bordered file-input-sm rounded-full"
          />
        </div>

        <div className="form-control">
          <label className="label label-text font-semibold">
            เอกสารรับรองการฉีดวัคซีน
          </label>
          <input
            type="file"
            {...register("vaccineFile", { required: true })}
            required
            accept="image/png,image/jpg,image/jpeg"
            className="file-input file-input-primary file-input-bordered file-input-sm rounded-full"
          />
        </div>

        <div className="form-control">
          <label className="label label-text font-semibold">
            ชื่อ - นามสกุล ผู้ส่งเข้าประกวด
          </label>
          <div className="flex justify-evenly gap-2">
            <input
              required
              type="text"
              {...register("ownerName", { required: true })}
              className="input input-bordered border-primary input-sm rounded-full"
            />
            <input
              required
              type="text"
              {...register("ownerLastname", { required: true })}
              className="input input-bordered border-primary input-sm rounded-full"
            />
          </div>
        </div>

        <div className="form-control">
          <label className="label label-text font-semibold">โทรศัพท์</label>
          <input
            required
            type="text"
            {...register("ownerTel", { required: true })}
            className="input input-bordered border-primary input-sm rounded-full"
          />
        </div>

        <div className="form-group border-primary my-2 rounded-xl border-[1px]">
          <h3 className="mt-2 px-3 font-semibold">
            ยิมยอนปฎิบัติตามข้อปฎิบัติสำหรับการประกวดควายปลักไทย{" "}
            <span className="text-info text-xs font-normal hover:underline">
              <Link href="">ข้อปฎิบัติ</Link>
            </span>
          </h3>
          <div className="flex justify-evenly">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text px-2">ยินยอม</span>
                <input
                  type="radio"
                  required
                  {...register("accept", { required: true })}
                  value="yes"
                  className="radio checked:bg-primary"
                ></input>
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text px-2">ไม่ยินยอม</span>
                <input
                  type="radio"
                  required
                  value="no"
                  {...register("accept", { required: true })}
                  className="radio checked:bg-primary"
                ></input>
              </label>
            </div>
          </div>
        </div>

        <div className="form-control flex flex-row justify-center gap-2">
          <button type="submit" className="btn btn-primary">
            บันทึก
          </button>
          <button type="reset" className="btn btn-outline btn-error">
            ล้าง
          </button>
        </div>
      </form>
    </div>
  );
}
