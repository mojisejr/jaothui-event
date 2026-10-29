import { useLine } from "~/context/lineContext";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import { api } from "~/utils/api";
import { parseThaiDate } from "~/utils/parseThaiDate";
import ThaiDatePicker from "~/components/ThaiDatePicker";
import { NormalClassSelector } from "./NormalClassSelector";
import {
  emptyNormalClassOptions,
  nextNormalLevel,
  reconcileNormalSelection,
  suggestNormalSelection,
  withCurrentRegistrationAuthorization,
  isSafeNormalRegistrationFailure,
} from "~/lib/normal-competition-levels";

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
  const { liff } = useLine();
  const operationId = useRef("");
  const thaiDate = parseThaiDate(new Date(deadline).getTime());
  const [calculatedAge, setCalculatedAge] = useState<number>(0);
  type NormalRequest = Parameters<typeof registerEvent>[0];
  const [pendingRequest, setPendingRequest] = useState<NormalRequest | null>(
    null,
  );
  const pendingRef = useRef<NormalRequest | null>(null);
  const [requestProblem, setRequestProblem] = useState("");
  const [confirmed, setConfirmed] = useState<{
    id: string;
    level: string;
    type: string;
  } | null>(null);

  const {
    data: metadata,
    mutate: search,
    isLoading: searching,
    isError: searchingError,
  } = api.metadata.getMetadataByMicrochip.useMutation();

  const {
    mutate: registerEvent,
    data: registrationResult,
    reset: resetRegistration,
    isLoading: registering,
    isSuccess: registered,
    isError: registerError,
    error: registerErrorObj,
  } = api.registerEvent.register.useMutation();

  // An unconfirmed normal request remains immutable, including after a network error.
  const isLoading = isAdminMode
    ? !!isRegistering
    : registering || pendingRequest !== null;

  const { data: typesWithAutoAssignment, isLoading: typeLoading } =
    api.event.getTypesWithAutoAssignment.useQuery({
      eventId: eventId,
      age: calculatedAge,
    });

  const { register, handleSubmit, watch, setValue, getValues } =
    useForm<EventRegisterType>();

  const selectionOptions = typesWithAutoAssignment ?? emptyNormalClassOptions;
  const selectedLevel = watch("competitionLevel") ?? "";
  const selectedType = watch("competitionType") ?? "";
  const birthDate = watch("buffaloBirthDate") ?? "";

  const beginAnotherRegistration = () => {
    if (!confirmed || isAdminMode) return;
    const level = nextNormalLevel(confirmed.level);
    resetRegistration();
    pendingRef.current = null;
    setPendingRequest(null);
    operationId.current = "";
    setRequestProblem("");
    setConfirmed(null);
    setValue("competitionLevel", level);
    setValue("competitionType", "");
    for (const key of ["accept1", "accept2", "accept3", "accept4"] as const)
      setValue(key, "");
  };

  const onSubmit = handleSubmit(async (data) => {
    if (typeLoading || searching || (!isAdminMode && pendingRef.current))
      return;
    if (!liff?.getIDToken() && !liff?.getAccessToken()) {
      alert(
        "กรุณาเข้าสู่ระบบ LINE ใหม่เพื่อยืนยันตัวตน หากยังสมัครไม่ได้ กรุณาติดต่อเจ้าหน้าที่",
      );
      return;
    }
    if (
      data.accept1 == "n" ||
      data.accept2 == "n" ||
      data.accept3 == "n" ||
      data.accept4 == "n"
    ) {
      alert("ต้องยินยอมข้อตกลงทุกข้อก่อนยืนยันการลงทะเบียน");
      return;
    }

    const choice = reconcileNormalSelection(
      { level: data.competitionLevel, type: data.competitionType },
      selectionOptions,
    );
    if (!choice.type || !choice.level) {
      alert("กรุณาเลือกระดับและรุ่นแข่งขันที่เข้าเกณฑ์");
      return;
    }
    operationId.current ||= crypto.randomUUID();

    if (isAdminMode && onAdminSubmit) {
      // Use admin registration endpoint with 'birthday' field
      const adminRegistrationData = {
        idToken: liff?.getIDToken() ?? undefined,
        lineAccessToken: !liff?.getIDToken()
          ? (liff?.getAccessToken() ?? undefined)
          : undefined,
        operationId: operationId.current,
        name: data.buffaloName,
        type: data.competitionType.replace(/^\[SP\]\s*/, "").trim(),
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
        idToken: liff?.getIDToken() ?? undefined,
        lineAccessToken: !liff?.getIDToken()
          ? (liff?.getAccessToken() ?? undefined)
          : undefined,
        operationId: operationId.current,
        name: data.buffaloName,
        type: data.competitionType.replace(/^\[SP\]\s*/, "").trim(),
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
      pendingRef.current = regularRegistrationData;
      setPendingRequest(regularRegistrationData);
      setRequestProblem("");
      registerEvent(regularRegistrationData);
    }
  });

  const handleSearchMetadata = () => {
    const microchipValue = getValues("microchip")?.trim();
    if (!microchipValue) {
      alert("กรุณากรอกเลขไมโครชิพก่อนค้นหา");
      return;
    }
    search({ microchip: microchipValue });
  };

  const handleBirthDateChange = useCallback(
    (isoDate: string) => {
      setValue("buffaloBirthDate", isoDate);
    },
    [setValue],
  );

  useEffect(() => {
    // Watch specific fields to prevent infinite loops when updating other fields
    const subscription = watch((value, { name }) => {
      // Only execute logic if the changed field is buffaloBirthDate or microchip
      if (name === "buffaloBirthDate" || name === "microchip") {
        const { buffaloBirthDate } = value;
        if (!buffaloBirthDate) return;

        const start = dayjs(buffaloBirthDate);
        // const end = dayjs(deadline).subtract(1, "day");
        const end = dayjs(deadline);
        let diff = end.diff(start, "month");
        const remainderDays = end.diff(start.add(diff, "month"), "day");

        if (remainderDays > 0) {
          diff += 1;
        }

        setCalculatedAge(diff);
      }
    });
    return () => subscription.unsubscribe();
  }, [deadline, watch]);

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
    if (isAdminMode) return;
    if (registered && pendingRef.current) {
      const id = (registrationResult as { _id?: unknown } | undefined)?._id;
      if (typeof id === "string" && id) {
        const saved = pendingRef.current;
        setConfirmed({ id, level: saved.level, type: saved.type });
        pendingRef.current = null;
        setPendingRequest(null);
        setRequestProblem("");
        operationId.current = "";
      } else {
        setRequestProblem(
          "ยังยืนยันรหัสใบสมัครไม่ได้ กรุณาลองคำขอเดิมอีกครั้ง",
        );
      }
    }
    if (registerError && pendingRef.current) {
      if (isSafeNormalRegistrationFailure(registerErrorObj)) {
        pendingRef.current = null;
        setPendingRequest(null);
        operationId.current = "";
        setRequestProblem(
          `${registerErrorObj.message} — แก้ไขข้อมูลแล้วส่งใหม่ได้`,
        );
      } else {
        setRequestProblem(
          `${registerErrorObj.message} — ยังยืนยันผลไม่ได้ ข้อมูลคำขอเดิมถูกเก็บไว้ กรุณาลองอีกครั้งโดยไม่เปลี่ยนข้อมูล`,
        );
      }
    }
  }, [
    registered,
    registerError,
    registerErrorObj,
    registrationResult,
    isAdminMode,
  ]);

  useEffect(() => {
    if (typeLoading || pendingRequest !== null || confirmed !== null) return;
    // Auto-select only once the age is known (microchip lookup or manual birthday).
    const next = birthDate
      ? suggestNormalSelection(
          { level: selectedLevel, type: selectedType },
          selectionOptions,
        )
      : reconcileNormalSelection(
          { level: selectedLevel, type: selectedType },
          selectionOptions,
        );
    if (next.level !== selectedLevel) setValue("competitionLevel", next.level);
    if (next.type !== selectedType) setValue("competitionType", next.type);
  }, [
    typesWithAutoAssignment,
    birthDate,
    typeLoading,
    selectedLevel,
    selectedType,
    pendingRequest,
    confirmed,
    setValue,
  ]);

  return (
    <div className="flex justify-center">
      <div className="max-w-md text-secondary">
        <h2 className="fron-bold pb-4 text-xl text-primary">{name}</h2>
        {confirmed && !isAdminMode ? (
          <section aria-label="ผลการสมัคร" className="space-y-4 text-base">
            <h3 role="status" className="text-xl font-semibold text-primary">
              สมัครสำเร็จแล้ว
            </h3>
            <p>
              ระดับ
              {confirmed.level === "จังหวัด"
                ? "จังหวัด / ท้องถิ่น"
                : confirmed.level}{" "}
              · {confirmed.type}
            </p>
            <p className="break-all text-sm">รหัสใบสมัคร: {confirmed.id}</p>
            <p>ควายตัวเดิมสมัครเพิ่มได้ โดยส่งใบสมัครใหม่แยกแต่ละรายการ</p>
            <button
              type="button"
              className="btn btn-primary h-auto min-h-12 w-full whitespace-normal py-3 text-base"
              onClick={beginAnotherRegistration}
            >
              สมัครควายตัวนี้เพิ่มอีกระดับหรือรุ่นอื่น
            </button>
          </section>
        ) : (
          <>
            {requestProblem && !pendingRequest ? (
              <p role="alert" className="my-3 text-base">
                {requestProblem}
              </p>
            ) : null}
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
              <fieldset
                disabled={isLoading}
                className="grid min-w-0 grid-cols-1 gap-2"
              >
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
                        <label
                          id="microchip-help"
                          className="label label-text-alt text-xs text-primary"
                        >
                          หากไม่มี microchip ให้ใส่ชื่อควายของคุณลงในช่อง
                          microchip
                        </label>
                      </div>
                      <button
                        type="button"
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
                      <label className="label label-text">
                        วันเดือนปีเกิดกระบือ
                      </label>
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
                        className="select select-sm text-base-content focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:text-base-300"
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
                        className="select select-sm text-base-content focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:text-base-300"
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
                  <label className="label label-text">
                    อายุกระบือ {"(เดือน)"}
                  </label>
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
                {/* Explicit level and eligible regular/special choices */}
                <NormalClassSelector
                  options={selectionOptions}
                  level={selectedLevel}
                  value={selectedType}
                  loading={typeLoading}
                  disabled={isLoading}
                  onLevelChange={(level) => {
                    const next = suggestNormalSelection(
                      { level, type: selectedType },
                      selectionOptions,
                      selectedLevel,
                    );
                    setValue("competitionLevel", next.level);
                    setValue("competitionType", next.type);
                  }}
                  onClassChange={(value) => setValue("competitionType", value)}
                />
                <input
                  type="hidden"
                  {...register("competitionLevel", { required: true })}
                />
                <input
                  type="hidden"
                  {...register("competitionType", { required: true })}
                />
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
                          <label htmlFor="accept1-yes" className="text-white">
                            ยินยอม
                          </label>
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
                          <label htmlFor="accept1-no" className="text-white">
                            ไม่ยินยอม
                          </label>
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
                          <label htmlFor="accept2-yes" className="text-white">
                            ยินยอม
                          </label>
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
                          <label htmlFor="accept2-no" className="text-white">
                            ไม่ยินยอม
                          </label>
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
                          <label htmlFor="accept3-yes" className="text-white">
                            ยินยอม
                          </label>
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
                          <label htmlFor="accept3-no" className="text-white">
                            ไม่ยินยอม
                          </label>
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
                          <label htmlFor="accept4-yes" className="text-white">
                            ยินยอม
                          </label>
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
                          <label htmlFor="accept4-no" className="text-white">
                            ไม่ยินยอม
                          </label>
                        </div>
                      </div>
                    </fieldset>
                  </div>
                </div>
                <button
                  disabled={isLoading || typeLoading || searching}
                  type="submit"
                  className="btn btn-primary my-2 min-h-12 text-base"
                  aria-label="ยืนยันการลงทะเบียนเข้าร่วมงาน"
                >
                  {isLoading
                    ? isAdminMode
                      ? "กำลังลงทะเบียน (Admin)"
                      : "กำลังยืนยัน"
                    : "ยืนยันการลงทะเบียน"}
                </button>
              </fieldset>
            </form>
            {pendingRequest && !registering ? (
              <div className="mt-4 space-y-3 text-base">
                <p role="alert">
                  {requestProblem ||
                    "ยังยืนยันผลคำขอไม่ได้ ข้อมูลถูกล็อกไว้เพื่อป้องกันการสมัครซ้ำ"}
                </p>
                <button
                  type="button"
                  className="btn btn-primary h-auto min-h-12 w-full whitespace-normal py-3 text-base"
                  onClick={() => {
                    if (!pendingRef.current || registering) return;
                    const idToken = liff?.getIDToken() ?? undefined;
                    const lineAccessToken = !idToken
                      ? (liff?.getAccessToken() ?? undefined)
                      : undefined;
                    if (!idToken && !lineAccessToken) {
                      setRequestProblem(
                        "กรุณาเข้าสู่ระบบ LINE ใหม่ แล้วลองคำขอเดิมอีกครั้ง ข้อมูลคำขอถูกเก็บไว้",
                      );
                      return;
                    }
                    registerEvent(
                      withCurrentRegistrationAuthorization(pendingRef.current, {
                        idToken,
                        lineAccessToken,
                      }),
                    );
                  }}
                >
                  ลองส่งคำขอเดิมอีกครั้ง
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default FormV3;
