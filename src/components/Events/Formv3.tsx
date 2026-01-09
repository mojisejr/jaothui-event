import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import { api } from "~/utils/api";
import { parseThaiDate } from "~/utils/parseThaiDate";
import ThaiDatePicker from "~/components/ThaiDatePicker";

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
  //new 15-oct-2024
  farmName: string;
  fatherName: string;
  motherName: string;
  province: string;
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
  deadline,
  isNational,
  isInHouse,
  isAdminMode = false,
  onAdminSubmit,
  isRegistering,
}: {
  userId: string;
  eventId: string;
  name: string;
  startAt: string;
  deadline: string;
  isNational: boolean;
  isInHouse: boolean;
  isAdminMode?: boolean;
  onAdminSubmit?: (data: any) => void;
  isRegistering?: boolean;
}) => {
  const thaiDate = parseThaiDate(new Date(deadline).getTime());
  const { replace } = useRouter();
  const [calculatedAge, setCalculatedAge] = useState<number>(0);
  const [inputMicrochip, setInputMicrochip] = useState<string>();
  const [autoAssignedClass, setAutoAssignedClass] = useState<{
    competitionLevel: string | null;
    competitionType: string | null;
    message: string;
  } | null>(null);
  const [isAutoAssigned, setIsAutoAssigned] = useState<boolean>(false);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);

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

  // Admin registration mutation
  const {
    mutate: registerAdminEvent,
    isLoading: adminRegistering,
    isSuccess: adminRegistered,
    isError: adminRegisterError,
    error: adminRegisterErrorObj,
  } = api.admin.registerAdminEvent.useMutation();

  // Determine current loading state
  const isLoading = isAdminMode ? 
    (adminRegistering || isRegistering) : 
    registering;

  const { data: typesWithAutoAssignment, isLoading: typeLoading } =
    api.event.getTypesWithAutoAssignment.useQuery({
      eventId: eventId,
      age: calculatedAge,
    });

  const {
    register,
    handleSubmit,
    watch,
    reset,
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

    if (isAdminMode && onAdminSubmit) {
      // Use admin registration endpoint with 'birthday' field
      const adminRegistrationData = {
        name: data.buffaloName,
        type: data.competitionType,
        level: data.competitionLevel,
        ownerName: `${data.firstName} ${data.lastName}`,
        sex: data.buffaloSex,
        buffaloAge: calculatedAge,
        color: data.buffaloColor,
        birthday: data.buffaloBirthDate,
        microchip: data.microchip,
        ownerTel: data.tel,
        fatherName: data.fatherName,
        motherName: data.motherName,
        farmName: data.farmName,
        province: data.province,
        userId,
        eventId,
      };
      onAdminSubmit(adminRegistrationData);
    } else {
      // Use regular registration endpoint with 'birthdate' field
      const regularRegistrationData = {
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
        fatherName: data.fatherName,
        motherName: data.motherName,
        farmName: data.farmName,
        province: data.province,
        userId,
        eventId,
      };
      registerEvent(regularRegistrationData);
    }
  });

  const handleSearchMetadata = () => {
    if (inputMicrochip == undefined) return;
    search({ microchip: inputMicrochip });
  };

  const handleBirthDateChange = useCallback((isoDate: string) => {
    setValue("buffaloBirthDate", isoDate);
  }, [setValue]);

  useEffect(() => {
    const subscription = watch(
      ({ buffaloBirthDate, microchip }) => {
        // const diff = dayjs(startAt).diff(buffaloBirthDate, "month");
        const start = dayjs(buffaloBirthDate);
        // const end = dayjs(deadline).subtract(1, "day");
        const end = dayjs(deadline);
        let diff = end.diff(start, "month");
        const remainderDays = end.diff(start.add(diff, "month"), "day");

        if (remainderDays > 0) {
          diff += 1;
        }

        setCalculatedAge(diff);
        setInputMicrochip(microchip);
        
        // Reset manual mode whenever birthday changes (to try auto-assign first)
        setIsManualMode(false);
      },
    );
    return () => subscription.unsubscribe();
  }, [deadline]);

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
  }, [registered, registerError, registerErrorObj, replace, reset]);

  // Auto-assignment effect
  useEffect(() => {
    // If Manual Mode is on, do NOT override with auto assignment
    if (isManualMode) return;

    if (typesWithAutoAssignment?.autoAssignment) {
      const { success, competitionLevel, competitionType, message } =
        typesWithAutoAssignment.autoAssignment;

      if (success && competitionLevel && competitionType) {
        // Auto-assign values
        setValue("competitionLevel", competitionLevel);
        setValue("competitionType", competitionType);
        setAutoAssignedClass({ competitionLevel, competitionType, message });
        setIsAutoAssigned(true);
      } else {
        // Clear auto-assignment if not successful
        setAutoAssignedClass({ competitionLevel: null, competitionType: null, message });
        setIsAutoAssigned(false);
        // Do not force manual mode here, let the user see the "not found" message and decide
      }
    }
  }, [typesWithAutoAssignment, setValue, isManualMode]);

  return (
    <div className="flex justify-center">
      <div className="max-w-md text-secondary">
        <h2 className="fron-bold pb-4 text-xl text-primary">{name}</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="ชื่อ"
              aria-label="ชื่อ"
              aria-required="true"
              autoComplete="given-name"
              disabled={searching || isLoading}
              {...register("firstName", { required: true })}
            />
          </div>
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="นามสกุล"
              aria-label="นามสกุล"
              aria-required="true"
              autoComplete="family-name"
              disabled={searching || isLoading}
              {...register("lastName", { required: true })}
            />
          </div>
          <div className="form-control">
            <input
              type="tel"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="เบอร์โทรติดต่อ"
              aria-label="เบอร์โทรติดต่อ"
              aria-required="true"
              autoComplete="tel"
              disabled={searching || isLoading}
              {...register("tel", { required: true })}
            />
          </div>
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="ชื่อฟาร์ม"
              aria-label="ชื่อฟาร์ม"
              aria-required="true"
              required
              disabled={searching || isLoading}
              {...register("farmName", { required: true })}
            />
          </div>

          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="ฟาร์มอยู่จังหวัด"
              aria-label="ฟาร์มอยู่จังหวัด"
              aria-required="true"
              required
              disabled={searching || isLoading}
              {...register("province", { required: true })}
            />
          </div>

          <div className="form-group">
            <label className="label label-text">ข้อมูลกระบือ</label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex gap-2">
                <div className="form-control">
                  <input
                    type="text"
                    className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                    placeholder="เลขไมโครชิพ"
                    aria-label="เลขไมโครชิพ"
                    aria-describedby="microchip-help"
                    disabled={searching || isLoading}
                    {...register("microchip")}
                  />
                  <label id="microchip-help" className="label label-text-alt text-xs text-primary">
                    หากไม่มี microchip ให้ใส่ชื่อควายของคุณลงในช่อง microchip
                  </label>
                </div>
                <button
                  disabled={searching || isLoading}
                  onClick={() => handleSearchMetadata()}
                  className="btn btn-primary btn-sm"
                  aria-label="ค้นหาข้อมูลจากไมโครชิพ"
                >
                  {searching ? "กำลังค้น" : "ค้นหา"}
                </button>
              </div>
              <div className="form-control">
                <input
                  type="text"
                  className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  placeholder="ชื่อกระบือ"
                  aria-label="ชื่อกระบือ"
                  aria-required="true"
                  disabled={searching || isLoading}
                  {...register("buffaloName", { required: true })}
                />
              </div>

              <div className="form-control">
                <label className="label label-text">วันเดือนปีเกิดกระบือ</label>
                <input
                  type="hidden"
                  {...register("buffaloBirthDate", {
                    required: true,
                    valueAsDate: false,
                  })}
                />
                <ThaiDatePicker
                  value={watch("buffaloBirthDate")}
                  onChange={handleBirthDateChange}
                  disabled={searching || isLoading}
                  required={true}
                  minYear={1900}
                  maxYear={new Date().getFullYear()}
                />
              </div>
              <div className="form-control">
                <select
                  className="select select-sm text-base-content disabled:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  aria-label="สีกระบือ"
                  aria-required="true"
                  disabled={searching || isLoading}
                  required
                  {...register("buffaloColor", { required: true })}
                >
                  <option value="black">ดำ</option>
                  <option value="albino">เผือก</option>
                </select>
              </div>
              <div className="form-control">
                <select
                  className="select select-sm text-base-content disabled:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  aria-label="เพศกระบือ"
                  aria-required="true"
                  disabled={searching || isLoading}
                  required
                  {...register("buffaloSex", { required: true })}
                >
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
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              aria-label="อายุกระบือ (เดือน)"
              aria-readonly="true"
              disabled={searching || isLoading}
              {...register("buffaloAge", { required: true })}
              value={calculatedAge}
              readOnly
            />
            <div className="form-control">
              <input
                type="text"
                className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                placeholder="ชื่อพ่อ"
                aria-label="ชื่อพ่อกระบือ"
                aria-required="true"
                required
                disabled={searching || isLoading}
                {...register("fatherName", { required: true })}
              />
            </div>
            <div className="form-control">
              <input
                type="text"
                className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                placeholder="ชื่อแม่"
                aria-label="ชื่อแม่กระบือ"
                aria-required="true"
                required
                disabled={searching || isLoading}
                {...register("motherName", { required: true })}
              />
            </div>
          </div>
          {/* Auto-assignment display */}
          {typeLoading ? (
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">กำลังคำนวณรุ่นที่เหมาะสม...</p>
                </div>
              </div>
            </div>
          ) : isManualMode ? (
            <div className="rounded-md bg-orange-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-orange-800">
                  เลือกประเภทการสมัครด้วยตนเอง
                </h3>
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className="text-xs text-orange-600 underline hover:text-orange-800"
                >
                  กลับไปใช้ระบบอัตโนมัติ
                </button>
              </div>
              <div className="space-y-3">
                <div className="form-control">
                  <label className="label label-text text-orange-900">
                    ระดับการประกวด
                  </label>
                  <select
                    className="select select-sm select-bordered w-full text-base-content"
                    {...register("competitionLevel", { required: true })}
                  >
                    <option value="">กรุณาเลือกระดับแข่งขัน</option>
                    <option value="จังหวัด">ระดับจังหวัด</option>
                    <option value="ประเทศ">ระดับประเทศ</option>
                  </select>
                </div>
                <div className="form-control">
                  <label className="label label-text text-orange-900">
                    รุ่นการประกวด (เฉพาะรุ่นพิเศษ)
                  </label>
                  <select
                    className="select select-sm select-bordered w-full text-base-content"
                    {...register("competitionType", { required: true })}
                  >
                    <option value="">กรุณาเลือกรุ่นแข่งขัน</option>
                    {watch("competitionLevel") === "จังหวัด" && (
                      <>
                        {typesWithAutoAssignment?.specialProvinceTypes?.map((type, idx) => (
                          <option key={`prov-sp-${idx}`} value={type}>
                            {type}
                          </option>
                        ))}
                      </>
                    )}
                    {watch("competitionLevel") === "ประเทศ" && (
                      <>
                        {typesWithAutoAssignment?.specialNationalTypes?.map((type, idx) => (
                          <option key={`nat-sp-${idx}`} value={type}>
                            {type}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                   <label className="label label-text-alt text-xs text-orange-700">
                    * แสดงเฉพาะรุ่นพิเศษที่ไม่สามารถคำนวณจากอายุได้ หากท่านต้องการสมัครรุ่นปกติ กรุณากลับไปใช้ระบบอัตโนมัติ
                  </label>
                </div>
              </div>
            </div>
          ) : isAutoAssigned && autoAssignedClass?.competitionLevel ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex justify-between">
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-green-800">
                    จัดรุ่นสำเร็จ!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p className="font-medium">
                      {autoAssignedClass.message}
                    </p>
                    <div className="mt-2 space-y-1">
                      <p>
                        <span className="font-semibold">ระดับ:</span> ระดับ
                        {autoAssignedClass.competitionLevel}
                      </p>
                      <p>
                        <span className="font-semibold">รุ่น:</span>{" "}
                        {autoAssignedClass.competitionType}
                      </p>
                    </div>
                  </div>
                </div>
                {((typesWithAutoAssignment?.specialProvinceTypes?.length ?? 0) > 0 || (typesWithAutoAssignment?.specialNationalTypes?.length ?? 0) > 0) && (
                   <div className="flex items-start">
                     <button
                       type="button"
                       onClick={() => setIsManualMode(true)}
                       className="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                     >
                       สมัครรุ่นพิเศษ?
                     </button>
                   </div>
                )}
              </div>
            </div>
          ) : autoAssignedClass?.message && !isAutoAssigned ? (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex flex-col gap-2">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-yellow-800">
                      ไม่สามารถจัดรุ่นอัตโนมัติได้
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>{autoAssignedClass.message}</p>
                    </div>
                  </div>
                </div>
                {((typesWithAutoAssignment?.specialProvinceTypes?.length ?? 0) > 0 || (typesWithAutoAssignment?.specialNationalTypes?.length ?? 0) > 0) && (
                   <div className="mt-2 flex justify-end">
                     <button
                       type="button"
                       onClick={() => setIsManualMode(true)}
                       className="rounded bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                     >
                       เลือกรุ่นด้วยตนเอง / สมัครรุ่นพิเศษ
                     </button>
                   </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Hidden inputs to hold auto-assigned values when NOT in manual mode */}
          {!isManualMode && (
          <>
            <input
              type="hidden"
              {...register("competitionLevel", { required: true })}
            />
            <input
              type="hidden"
              {...register("competitionType", { required: true })}
            />
          </>
          )}
          <div className="form-group">
            <label className="label label-text">เงื่อนไชข้อตกลง</label>
            <div className="grid grid-cols-1 gap-2">
              <fieldset className="form-control">
                <legend className="label label-text">
                  1. หากกระบือของท่านยังไม่มีการฝังไมโครชิป
                  จะต้องดำเนินการฝังหน้างาน ตัวละ 500 บาท
                </legend>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      id="accept1-yes"
                      aria-label="ยินยอมข้อ 1"
                      {...register("accept1", { required: true })}
                    />
                    <label htmlFor="accept1-yes" className="text-white">ยินยอม</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      id="accept1-no"
                      aria-label="ไม่ยินยอมข้อ 1"
                      {...register("accept1", { required: true })}
                    />
                    <label htmlFor="accept1-no" className="text-white">ไม่ยินยอม</label>
                  </div>
                </div>
              </fieldset>
              <fieldset className="form-control">
                <legend className="label label-text">
                  2. กรณีแจ้งวันเดือนปีเกิดไม่ตรงตามความจริง
                  ทางกองประกวดขอสงวนสิทธิ์ในการริบรางวัลคืน
                  และประกาศผ่านสื่อของกองประกวด
                </legend>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      id="accept2-yes"
                      aria-label="ยินยอมข้อ 2"
                      {...register("accept2", { required: true })}
                    />
                    <label htmlFor="accept2-yes" className="text-white">ยินยอม</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      id="accept2-no"
                      aria-label="ไม่ยินยอมข้อ 2"
                      {...register("accept2", { required: true })}
                    />
                    <label htmlFor="accept2-no" className="text-white">ไม่ยินยอม</label>
                  </div>
                </div>
              </fieldset>
              <fieldset className="form-control">
                <legend className="label label-text">
                  3. การเลือกรุ่นประกวด ให้นับอายุถึง{" "}
                  {`วันที่ ${thaiDate.date} ${thaiDate.thaiMonth}  พ.ศ. ​${thaiDate.thaiYear}`}
                </legend>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      id="accept3-yes"
                      aria-label="ยินยอมข้อ 3"
                      {...register("accept3", { required: true })}
                    />
                    <label htmlFor="accept3-yes" className="text-white">ยินยอม</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      id="accept3-no"
                      aria-label="ไม่ยินยอมข้อ 3"
                      {...register("accept3", { required: true })}
                    />
                    <label htmlFor="accept3-no" className="text-white">ไม่ยินยอม</label>
                  </div>
                </div>
              </fieldset>
              <fieldset className="form-control">
                <legend className="label label-text">
                  4. กรณีเลือกรุ่นประกวดไม่ตรงทางกองประกวด
                  ขอสงวนสิทธิ์ในการรับรุ่น ณ จุดลงทะเบียน
                </legend>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      id="accept4-yes"
                      aria-label="ยินยอมข้อ 4"
                      {...register("accept4", { required: true })}
                    />
                    <label htmlFor="accept4-yes" className="text-white">ยินยอม</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      id="accept4-no"
                      aria-label="ไม่ยินยอมข้อ 4"
                      {...register("accept4", { required: true })}
                    />
                    <label htmlFor="accept4-no" className="text-white">ไม่ยินยอม</label>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
          <button
            disabled={isLoading}
            type="submit"
            className="btn btn-primary btn-sm my-2"
            aria-label="ยืนยันการลงทะเบียนเข้าร่วมงาน"
          >
            {isLoading ? (isAdminMode ? "กำลังลงทะเบียน (Admin)" : "กำลังยืนยัน") : "ยืนยันการลงทะเบียน"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FormV3;
