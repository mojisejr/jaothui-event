import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import { api } from "~/utils/api";
import { inHouse, national } from "~/constants/competition-class";

type EventRegisterType = {
  firstName: string;
  lastName: string;
  tel: string;
  microchip: string;
  buffaloName: string;
  buffaloBirthDate: string;
  buffaloColor: "black" | "albino";
  buffaloSex: "male" | "female";
  buffaloAge: number;
  competitionLevel: string;
  competitionType: string;
  accept1: string;
  accept2: string;
  accept3: string;
  accept4: string;
};

const FormV3 = ({
  userId,
  eventId,
  name,
  startAt,
}: {
  userId: string;
  eventId: string;
  name: string;
  startAt: string;
}) => {
  const { replace } = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<string>();
  const [calculatedAge, setCalculatedAge] = useState<number>(0);
  const [inputMicrochip, setInputMicrochip] = useState<string>();

  const {
    data: metadata,
    mutate: search,
    isLoading: searching,
    isError: searchingError,
  } = api.metadata.getMetadataByMicrochip.useMutation();

  const {
    mutate: registerEvent,
    isLoading: registering,
    isSuccess: registered,
    isError: registerError,
    error: registerErrorObj,
  } = api.registerEvent.register.useMutation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setValue,
  } = useForm<EventRegisterType>();

  const onSubmit = handleSubmit(async (data) => {
    if (
      data.accept1 == "n" ||
      data.accept2 == "n" ||
      data.accept3 == "n" ||
      data.accept4 == "n"
    ) {
      alert("ต้องยินยอมข้อตกลงทุกข้อก่อนยืนยันการลงทะเบียน");
      return;
    }

    registerEvent({
      name: data.buffaloName,
      type: data.competitionType,
      level: data.competitionLevel,
      ownerName: `${data.firstName} ${data.lastName}`,
      sex: data.buffaloSex,
      buffaloAge: calculatedAge,
      color: data.buffaloColor,
      birthdate: data.buffaloBirthDate,
      microchip: data.microchip,
      ownerTel: data.tel,
      userId,
      eventId,
    });

    // console.log(data);
  });

  const handleSearchMetadata = () => {
    if (inputMicrochip == undefined) return;
    search({ microchip: inputMicrochip });
  };

  useEffect(() => {
    const subscription = watch(
      ({ competitionLevel, buffaloBirthDate, microchip }) => {
        const diff = dayjs(startAt).diff(buffaloBirthDate, "month");
        setCalculatedAge(diff);
        setInputMicrochip(microchip);
        // console.log(competitionLevel);
        if (competitionLevel == "การประกวดระดับ") return;
        setSelectedLevel(competitionLevel);
      },
    );
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (metadata != undefined) {
      setValue("buffaloName", metadata.name);
      setValue(
        "buffaloBirthDate",
        new Date(metadata.birthdate * 1000).toISOString().substring(0, 10),
      );
      setValue(
        "buffaloColor",
        metadata.color.toLowerCase() as "black" | "albino",
      );
      setValue("buffaloSex", metadata?.sex.toLowerCase() as "male" | "female");
    }

    if (searchingError) {
      alert("ไม่พบไม่โครชิพที่ค้นหา");
      return;
    }
  }, [metadata, searchingError]);

  useEffect(() => {
    if (registered && !registerError) {
      void replace("/success");
    }
    if (registerError) {
      alert(registerErrorObj.message);
      reset();
      return;
    }
  }, [registered, registerError]);

  return (
    <div className="text-secondary">
      <h2 className="fron-bold pb-4 text-xl text-primary">{name}</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
        <div className="form-control">
          <input
            type="text"
            className="input input-sm input-bordered text-black"
            placeholder="ชื่อ"
            disabled={searching || registering}
            {...register("firstName", { required: true })}
          />
        </div>
        <div className="form-control">
          <input
            type="text"
            className="input input-sm input-bordered text-black"
            placeholder="นามสกุล"
            disabled={searching || registering}
            {...register("lastName", { required: true })}
          />
        </div>
        <div className="form-control">
          <input
            type="text"
            className="input input-sm input-bordered text-black"
            placeholder="เบอร์โทรติดต่อ"
            disabled={searching || registering}
            {...register("tel", { required: true })}
          />
        </div>
        <div className="form-group">
          <label className="label label-text">ข้อมูลกระบือ</label>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-2">
              <div className="form-control">
                <input
                  type="text"
                  className="input input-sm input-bordered text-black"
                  placeholder="เลขไมโครชิพ"
                  disabled={searching || registering}
                  {...register("microchip")}
                />
                <label className="label label-text-alt text-xs text-primary">
                  หากไม่มี microchip ให้ใส่ชื่อควายของคุณลงในช่อง microchip
                </label>
              </div>
              <button
                disabled={searching || registering}
                onClick={() => handleSearchMetadata()}
                className="btn btn-primary btn-sm"
              >
                {searching ? "กำลังค้น" : "ค้นหา"}
              </button>
            </div>
            <div className="form-control">
              <input
                type="text"
                className="input input-sm input-bordered text-black"
                placeholder="ชื่อกระบือ"
                disabled={searching || registering}
                {...register("buffaloName", { required: true })}
              />
            </div>

            <div className="form-control">
              <label className="label label-text">วันเดือนปีเกิดกระบือ</label>
              <input
                type="date"
                className="input input-sm input-bordered text-black"
                disabled={searching || registering}
                {...register("buffaloBirthDate", {
                  required: true,
                  valueAsDate: false,
                })}
              />
            </div>
            <div className="form-control">
              <select
                className="select select-sm text-black disabled:text-slate-300"
                disabled={searching || registering}
                {...register("buffaloColor", { required: true })}
              >
                <option disabled selected>
                  สี
                </option>
                <option value="black">ดำ</option>
                <option value="albino">เผือก</option>
              </select>
            </div>
            <div className="form-control">
              <select
                className="select select-sm text-black disabled:text-slate-300"
                disabled={searching || registering}
                {...register("buffaloSex")}
              >
                <option disabled selected>
                  เพศ
                </option>
                <option value="male">เพศผู้</option>
                <option value="female">เพศเมีย</option>
              </select>
            </div>
          </div>
        </div>
        <div className="form-control">
          <label className="label label-text">อายุกระบือ {"(เดือน)"}</label>
          <input
            type="text"
            placeholder="อายุกระบือ (เดือน)"
            className="input input-sm input-bordered text-black"
            disabled={searching || registering}
            {...register("buffaloAge", { required: true })}
            value={calculatedAge}
            readOnly
          />
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">ระดับ</label>
          <select
            className="select select-bordered select-sm text-black"
            disabled={searching || registering}
            {...register("competitionLevel")}
          >
            <option disabled selected>
              การประกวดระดับ
            </option>
            <option value="จังหวัด">ระดับจังหวัด</option>
            <option value="ประเทศ">ระดับประเทศ</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label label-text font-semibold">
            รุ่นที่จะประกวด
          </label>
          <select
            {...register("competitionType", { required: true })}
            disabled={selectedLevel == undefined || searching || registering}
            className="select select-bordered select-sm text-black"
          >
            <option disabled={true} selected>
              เลือก
            </option>
            {selectedLevel == "จังหวัด" ? (
              <>
                {inHouse.map((ih) => (
                  <option key={ih} value={ih}>
                    {ih}
                  </option>
                ))}
              </>
            ) : (
              <>
                {national.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
        <div className="form-group">
          <label className="label label-text">เงื่อนไชข้อตกลง</label>
          <div className="grid grid-cols-1 gap-2">
            <div className="form-control">
              <label className="label label-text">
                1. หากกระบือของท่านยังไม่มีการฝังไมโครชิป
                จะต้องดำเนินการฝังหน้างาน ตัวละ 500 บาท
              </label>
              <div className="grid grid-cols-2 place-items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="y"
                    {...register("accept1", { required: true })}
                  />
                  <span className="text-white">ยินยอม</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="n"
                    {...register("accept1", { required: true })}
                  />
                  <span className="text-white">ไม่ยินยอม</span>
                </div>
              </div>
            </div>
            <div className="form-control">
              <label className="label label-text">
                2. กรณีแจ้งวันเดือนปีเกิดไม่ตรงตามความจริง
                ทางกองประกวดขอสงวนสิทธิ์ในการริบรางวัลคืน
                และประกาศผ่านสื่อของกองประกวด
              </label>
              <div className="grid grid-cols-2 place-items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="y"
                    {...register("accept2", { required: true })}
                  />
                  <span className="text-white">ยินยอม</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="n"
                    {...register("accept2", { required: true })}
                  />
                  <span className="text-white">ไม่ยินยอม</span>
                </div>
              </div>
            </div>
            <div className="form-control">
              <label className="label label-text">
                3. การเลือกรุ่นประกวด ให้นับอายุถึง วันที่ 12 ตุลาคม 2567
              </label>
              <div className="grid grid-cols-2 place-items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="y"
                    {...register("accept3", { required: true })}
                  />
                  <span className="text-white">ยินยอม</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="n"
                    {...register("accept3", { required: true })}
                  />
                  <span className="text-white">ไม่ยินยอม</span>
                </div>
              </div>
            </div>
            <div className="form-control">
              <label className="label label-text">
                4. กรณีเลือกรุ่นประกวดไม่ตรงทางกองประกวด
                ขอสงวนสิทธิ์ในการรับรุ่น ณ จุดลงทะเบียน
              </label>
              <div className="grid grid-cols-2 place-items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="y"
                    {...register("accept4", { required: true })}
                  />
                  <span className="text-white">ยินยอม</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="n"
                    {...register("accept4", { required: true })}
                  />
                  <span className="text-white">ไม่ยินยอม</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-sm my-2">
          ยืนยันการลงทะเบียน
        </button>
      </form>
    </div>
  );
};

export default FormV3;
