import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import { api } from "~/utils/api";
import { royal } from "~/constants/competition-class";
import { imagesUpload } from "~/server/services/image-upload.service";
import {
  getProvinces,
  getAmphoeFromProvince,
  getDistrictsFromAmphoe,
} from "~/utils/addressHelper";
import { parseRoyalImageData } from "~/utils/parseRoyalImageData";
import Image from "next/image";

type RoyalFormTypes = {
  firstName: string;
  lastName: string;
  tel: string;
  address: string;
  province: string;
  amphoe: string;
  district: string;
  zipcode: string;
  microchip: string;
  buffaloName: string;
  buffaloBirthDate: string;
  buffaloColor: "black" | "albino";
  buffaloSex: "male" | "female";
  buffaloAge: number;
  competitionType: string;
  farmName: string;
  fatherName: string;
  motherName: string;
  buffaloImage: FileList;
  frontImage: FileList;
  sideImage: FileList;
  backImage: FileList;
  d1Accept: "y" | "n";
  d2Accept: "y" | "n";
  d3Accept: "y" | "n";
  accept1: "y" | "n";
  accept2: "y" | "n";
  accept3: "y" | "n";
  accept4: "y" | "n";
  accept5: "y" | "n";
  accept6: "y" | "n";
  accept7: "y" | "n";
  accept8: "y" | "n";
  accept9: "y" | "n";
};

const RoyalForm = ({
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
  const [province, setProvince] = useState<string>();
  const [amphoe, setAmphoe] = useState<string>();

  const { replace } = useRouter();
  const [calculatedAge, setCalculatedAge] = useState<number>(0);
  const [inputMicrochip, setInputMicrochip] = useState<string>();
  const [formSubmiting, setSubmiting] = useState<boolean>(false);

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
  } = api.registerEvent.registerRoyalEvent.useMutation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setValue,
  } = useForm<RoyalFormTypes>();

  const onSubmit = handleSubmit(async (data) => {
    setSubmiting(true);
    if (
      data.accept1 == "n" ||
      data.accept2 == "n" ||
      data.accept3 == "n" ||
      data.accept4 == "n" ||
      data.accept5 == "n" ||
      data.accept6 == "n" ||
      data.accept7 == "n" ||
      data.accept8 == "n"
    ) {
      alert("ต้องยินยอมข้อตกลงทุกข้อก่อนยืนยันการลงทะเบียน");
      setSubmiting(false);
      return;
    }

    if (data.d1Accept == "n" || data.d2Accept == "n" || data.d3Accept == "n") {
      alert("ต้องยินยอมข้อตกลงทุกข้อก่อนยืนยันการลงทะเบียน");
      setSubmiting(false);
      return;
    }

    /**Upload Image and get URLs */
    const imagesList = [
      data.buffaloImage[0],
      data.frontImage[0],
      data.sideImage[0],
      data.backImage[0],
    ];

    imagesList.forEach((img) => {
      if (!img) {
        alert("กรุณาอัพโหลดรูปให้ครบ");
        setSubmiting(false);
        return;
      }
    });

    const parsedImageData = parseRoyalImageData(
      imagesList[0]!,
      imagesList[1]!,
      imagesList[2]!,
      imagesList[3]!,
    );

    const uploadResults = await imagesUpload(userId, eventId, parsedImageData);

    if (!uploadResults) {
      alert("ไม่ามารถอัพโหลดรูปได้");
      setSubmiting(false);
      return;
    }

    /**Upload Register Event */
    registerEvent({
      name: data.buffaloName,
      type: data.competitionType,
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
      address: data.address,
      amphoe: data.amphoe,
      district: data.district,
      province: data.province,
      zipcode: data.zipcode,
      buffaloImage: uploadResults[0]?._id!,
      frontImage: uploadResults[1]?._id!,
      sideImage: uploadResults[2]?._id!,
      backImage: uploadResults[3]?._id!,
      // d1Image: uploadResults[4]?._id!,
      // d2Image: uploadResults[5]?._id!,
      // d3Image: uploadResults[6]?._id!,
      userId,
      eventId,
    });
  });

  const handleSearchMetadata = () => {
    if (inputMicrochip == undefined) return;
    search({ microchip: inputMicrochip });
  };

  useEffect(() => {
    const subscription = watch(
      ({ buffaloBirthDate, microchip, buffaloColor }) => {
        const start = dayjs(buffaloBirthDate);
        const end = dayjs(startAt).subtract(1, "day");
        let diff = end.diff(start, "month");
        const remainderDays = end.diff(start.add(diff, "month"), "day");

        if (remainderDays > 0) {
          diff += 1;
        }

        //Albino will be decreased by 1 day
        if (buffaloColor == "black") {
          setCalculatedAge(diff);
        } else {
          setCalculatedAge(diff - 1);
        }

        setInputMicrochip(microchip);
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
      setSubmiting(false);
      void replace("/success");
    }
    if (registerError) {
      alert(registerErrorObj.message);
      setSubmiting(false);
      reset();
      return;
    }
  }, [registered, registerError]);

  return (
    <div className="flex w-full justify-center">
      <div className="max-w-md justify-center text-secondary">
        <h2 className="fron-bold pb-4 text-xl text-primary">{name}</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
          {/**firstName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="ชื่อ"
              aria-label="ชื่อ"
              aria-required="true"
              autoComplete="given-name"
              disabled={searching || registering}
              {...register("firstName", { required: true })}
            />
          </div>

          {/**lastName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="นามสกุล"
              aria-label="นามสกุล"
              aria-required="true"
              autoComplete="family-name"
              disabled={searching || registering}
              {...register("lastName", { required: true })}
            />
          </div>

          {/**tel */}
          <div className="form-control">
            <input
              type="tel"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="เบอร์โทรติดต่อ"
              aria-label="เบอร์โทรติดต่อ"
              aria-required="true"
              autoComplete="tel"
              disabled={searching || registering}
              {...register("tel", { required: true })}
            />
          </div>

          {/**farmName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-base-content placeholder:text-base-300 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="ชื่อฟาร์ม"
              aria-label="ชื่อฟาร์ม"
              aria-required="true"
              required
              disabled={searching || registering}
              {...register("farmName", { required: true })}
            />
          </div>

          {/**address */}
          <div className="form-group text-black">
            <label className="label label-text font-semibold text-white">
              ที่อยู่
            </label>
            <div className="grid grid-cols-1 gap-2">
              {/**address */}
              <div className="form-control">
                <input
                  type="text"
                  {...register("address", { required: true })}
                  className="input input-sm input-bordered text-base-content placeholder:text-base-300"
                  placeholder="บ้านเลขที่"
                  aria-label="บ้านเลขที่"
                  aria-required="true"
                  autoComplete="street-address"
                  required
                ></input>
              </div>
              {/**province */}
              <div className="form-control">
                <select
                  defaultValue="0"
                  {...register("province", { required: true })}
                  className="select select-bordered select-sm text-base-content"
                  aria-label="จังหวัด"
                  aria-required="true"
                  onChange={(e) => setProvince(e.target.value)}
                  required
                >
                  <option disabled value="0">
                    จังหวัด
                  </option>
                  {getProvinces().map((p, index) => (
                    <option key={index} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              {/**amphoe */}
              <div className="form-control">
                <select
                  defaultValue="0"
                  {...register("amphoe", { required: true })}
                  className="select select-bordered select-sm text-base-content"
                  aria-label="อำเภอ"
                  aria-required="true"
                  onChange={(e) => setAmphoe(e.target.value)}
                  required
                >
                  <option disabled value="0">
                    อำเภอ
                  </option>
                  {getAmphoeFromProvince(province!).map((p, index) => (
                    <option key={index} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              {/**district */}
              <div className="form-control">
                <select
                  defaultValue="0"
                  {...register("district", { required: true })}
                  className="select select-bordered select-sm text-base-content"
                  aria-label="ตำบล"
                  aria-required="true"
                  required
                >
                  <option disabled value="0">
                    ตำบล
                  </option>
                  {getDistrictsFromAmphoe(province!, amphoe!).map(
                    (p, index) => (
                      <option key={index} value={p}>
                        {p}
                      </option>
                    ),
                  )}
                </select>
              </div>
              {/**zipcode */}
              <div className="form-control">
                <input
                  type="number"
                  {...register("zipcode", { required: true })}
                  className="input input-sm input-bordered text-base-content placeholder:text-base-300"
                  placeholder="รหัสไปรษณี"
                  aria-label="รหัสไปรษณี"
                  aria-required="true"
                  autoComplete="postal-code"
                  required
                ></input>
              </div>
            </div>
          </div>

          {/**Buffalo Group */}
          <div className="form-group">
            <label className="label label-text">ข้อมูลกระบือ</label>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex gap-2">
                {/**Microchip */}
                <div className="form-control">
                  <input
                    type="text"
                    className="input input-sm input-bordered text-gray-900 placeholder:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                    placeholder="เลขไมโครชิพ"
                    aria-label="เลขไมโครชิพ"
                    aria-describedby="microchip-help-royal"
                    disabled={searching || registering}
                    {...register("microchip")}
                  />
                  <label id="microchip-help-royal" className="label label-text-alt text-xs text-primary">
                    หากไม่มี microchip ให้ใส่ชื่อควายของคุณลงในช่อง microchip
                  </label>
                </div>
                <button
                  disabled={searching || registering}
                  onClick={() => handleSearchMetadata()}
                  className="btn btn-primary btn-sm"
                  aria-label="ค้นหาข้อมูลจากไมโครชิพ"
                >
                  {searching ? "กำลังค้น" : "ค้นหา"}
                </button>
              </div>

              {/**buffaloName */}
              <div className="form-control">
                <input
                  type="text"
                  className="input input-sm input-bordered text-gray-900 placeholder:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  placeholder="ชื่อกระบือ"
                  aria-label="ชื่อกระบือ"
                  aria-required="true"
                  disabled={searching || registering}
                  {...register("buffaloName", { required: true })}
                />
              </div>

              {/**date */}
              <div className="form-control">
                <label className="label label-text">วันเดือนปีเกิดกระบือ</label>
                <input
                  type="date"
                  className="input input-sm input-bordered text-gray-900 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  aria-label="วันเดือนปีเกิดกระบือ"
                  aria-required="true"
                  disabled={searching || registering}
                  {...register("buffaloBirthDate", {
                    required: true,
                    valueAsDate: false,
                  })}
                />
              </div>

              {/**buffaloColor */}
              <div className="form-control">
                <select
                  className="select select-sm text-gray-900 disabled:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  aria-label="สีกระบือ"
                  aria-required="true"
                  disabled={searching || registering}
                  required
                  {...register("buffaloColor", { required: true })}
                >
                  <option value="black">ดำ</option>
                  <option value="albino">เผือก</option>
                </select>
              </div>

              {/**buffaloSex */}
              <div className="form-control">
                <select
                  className="select select-sm text-gray-900 disabled:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
                  aria-label="เพศกระบือ"
                  aria-required="true"
                  disabled={searching || registering}
                  required
                  {...register("buffaloSex", { required: true })}
                >
                  <option value="male">เพศผู้</option>
                  <option value="female">เพศเมีย</option>
                </select>
              </div>
            </div>
          </div>

          {/**buffaloAge */}
          <div className="form-control">
            <label className="label label-text">อายุกระบือ {"(เดือน)"}</label>
            <input
              type="text"
              placeholder="อายุกระบือ (เดือน)"
              className="input input-sm input-bordered text-gray-900 placeholder:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              aria-label="อายุกระบือ (เดือน)"
              aria-readonly="true"
              disabled={searching || registering}
              {...register("buffaloAge", { required: true })}
              value={calculatedAge}
              readOnly
            />
            <label className="label label-text-alt text-primary">{`*** เผือกนับถึงวันที่ 11 ดำ นับถึงวันที่ 12`}</label>
          </div>

          {/**fatherName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-gray-900 placeholder:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="ชื่อพ่อ"
              aria-label="ชื่อพ่อกระบือ"
              aria-required="true"
              required
              disabled={searching || registering}
              {...register("fatherName", { required: true })}
            />
          </div>

          {/**motherName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-gray-900 placeholder:text-gray-600 focus:outline-2 focus:outline-offset-2 focus:outline-primary"
              placeholder="ชื่อแม่"
              aria-label="ชื่อแม่กระบือ"
              aria-required="true"
              required
              disabled={searching || registering}
              {...register("motherName", { required: true })}
            />
          </div>

          {/**competitionType */}
          <div className="form-control">
            <label className="label label-text font-semibold">
              รุ่นที่จะประกวด
            </label>
            <select
              required
              {...register("competitionType", { required: true })}
              disabled={searching || registering}
              className="select select-bordered select-sm text-black"
            >
              <option value={undefined} disabled selected>
                เลือก
              </option>
              {royal.map((m, index) => (
                <option key={index} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/**
           * Image Uploading Group
           */}
          <div className="form-group">
            {/**buffaloImage */}
            <div className="form-control">
              <div className="label label-text">ภาพบัตรประจำตัวสัตว์</div>
              <div className="flex w-full flex-col items-center justify-center gap-1">
                <figure className="max-w-64">
                  <Image
                    src="/images/template.png"
                    width={1000}
                    height={700}
                    alt="template"
                  />
                </figure>
                <caption className="text-slate-500">
                  ตัวอย่างภาพบัตรประจำตัวสัตว์
                </caption>
              </div>
              <input
                type="file"
                {...register("buffaloImage", { required: true })}
                className="file-input file-input-bordered file-input-sm mt-1 text-black"
                required
              />
            </div>

            {/**frontImage */}
            <div className="form-control">
              <div className="label label-text">ภาพถ่ายหน้าตรงกระบือ</div>
              <input
                type="file"
                {...register("frontImage", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div>

            {/**sideImage */}
            <div className="form-control">
              <div className="label label-text">ภาพถ่ายด้านข้างกระบือ</div>
              <input
                type="file"
                {...register("sideImage", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div>

            {/**backImage */}
            <div className="form-control">
              <div className="label label-text">ภาพถ่ายด้านท้ายกระบือ</div>
              <input
                type="file"
                {...register("backImage", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div>

            {/**d1Image */}
            <div className="form-control">
              <label className="label label-text">
                ท่านจะต้องนำเอกสารการตรวจโรคแท้งติดต่อมายื่นที่สนามประกวด ณ
                วันประกวด
              </label>
              <div className="grid grid-cols-2 place-items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="y"
                    {...register("d1Accept", { required: true })}
                  />
                  <span className="text-white">ยินยอม</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="n"
                    {...register("d1Accept", { required: true })}
                  />
                  <span className="text-white">ไม่ยินยอม</span>
                </div>
              </div>
            </div>
            {/* <div className="form-control">
              <div className="label label-text">เอกสารตรวจโรคแท้งติดต่อ</div>
              <input
                type="file"
                {...register("d1Image", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div> */}

            {/**d2Image */}
            <div className="form-control">
              <label className="label label-text">
                ท่านจะต้องนำเอกสารการตรวจโครโมโซมมายื่นที่สนามประกวด ณ วันประกวด
              </label>
              <div className="grid grid-cols-2 place-items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="y"
                    {...register("d2Accept", { required: true })}
                  />
                  <span className="text-white">ยินยอม</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="n"
                    {...register("d2Accept", { required: true })}
                  />
                  <span className="text-white">ไม่ยินยอม</span>
                </div>
              </div>
            </div>
            {/* <div className="form-control">
              <div className="label label-text">ใบรับรองการตรวจโครโมโซม</div>
              <input
                type="file"
                {...register("d2Image", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div> */}

            {/**d3Image */}
            <div className="form-control">
              <label className="label label-text">
                ท่านจะต้องนำเอกสารการรับวัคซีน FMD
                ปากเท้าเปื่อยและคอบวมมายื่นที่สนามประกวด ณ วันประกวด
              </label>
              <div className="grid grid-cols-2 place-items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="y"
                    {...register("d3Accept", { required: true })}
                  />
                  <span className="text-white">ยินยอม</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="radio"
                    value="n"
                    {...register("d3Accept", { required: true })}
                  />
                  <span className="text-white">ไม่ยินยอม</span>
                </div>
              </div>
            </div>
            {/* <div className="form-control">
              <div className="label label-text">
                ใบรับรองการฉีดวัคซีน FMD และคอบวม
              </div>
              <input
                type="file"
                {...register("d3Image", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div> */}
          </div>

          <p className="font-bold text-red-600">
            การตรวจโครโมโซม และโรคแท้งติดต่อ และขอรับ
            ฉีดวัคซีนโรคคอบวมและปากเท้าเปื่อย ท่านสามารถ ติดต่อ
            ปศุสัตว์อำเภอในพื้นที่เพื่อรับบริการ ฟรี!!!
          </p>

          {/**Condition Group */}
          <div className="form-group">
            <label className="label label-text">เงื่อนไชข้อตกลง</label>
            <div className="grid grid-cols-1 gap-2">
              <div className="form-control">
                <label className="label label-text">
                  1. กระบือที่ผ่านการพิจารณาคัดเลือกเข้าประกวด
                  จะต้องดำเนินนำเอกสาร การรับวัคซีน และการตรวจ โครโมโซม
                  ยืนยันการเป็นกระบือปลัก ณ สนามประกวด (ไม่มีค่าใช้จ่าย)
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
                  2. กรณีกระบือของท่านได้รับรางวัล ท่านยินดีนำ
                  กระบือเข้าศูนย์รีดมาตรฐานของกรมปศุสัตว์ เพื่อทำการรีดน้ำเชื้อ
                  (ไม่มีค่าใช้จ่าย)
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
                  3. ห้ามอัดหญ้า, ห้ามกรอกอาหาร, ห้ามกรอกน้ำ
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
                  4. กระบือทุกตัวจะต้องถูกตรวจปัสสาวะที่สนาม
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
              <div className="form-control">
                <label className="label label-text">
                  5. กระบือเผือก เข้ายืนยันตัวตนพร้อมกระบือ ที่สนามประกวดวันที่
                  10 มกราคม 2568 ตั้งแต่ เวลา 05.30 น. - 10.00 น.
                  และเริ่มการประกวด วันที่ 11 มกราคม 2568 เวลา 8.30 น.
                </label>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      {...register("accept5", { required: true })}
                    />
                    <span className="text-white">ยินยอม</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      {...register("accept5", { required: true })}
                    />
                    <span className="text-white">ไม่ยินยอม</span>
                  </div>
                </div>
              </div>
              <div className="form-control">
                <label className="label label-text">
                  6. กระบือดำ เข้ายืนยันตัวตนพร้อมกระบือ ที่สนามประกวดวันที่ 11
                  มกราคม 2568 ตั้งแต่ เวลา 05.30 น. - 10.00 น. และเริ่มการประกวด
                  วันที่ 12 มกราคม 2568 เวลา 8.30 น.
                </label>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      {...register("accept6", { required: true })}
                    />
                    <span className="text-white">ยินยอม</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      {...register("accept6", { required: true })}
                    />
                    <span className="text-white">ไม่ยินยอม</span>
                  </div>
                </div>
              </div>

              <div className="form-control">
                <label className="label label-text">
                  7. กระบือที่ส่งเข้าประกวดต้องเกิดจากพ่อ-แม่พันธุ์
                  กระบือปลักไทย เท่านั้น
                </label>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      {...register("accept7", { required: true })}
                    />
                    <span className="text-white">ยินยอม</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      {...register("accept7", { required: true })}
                    />
                    <span className="text-white">ไม่ยินยอม</span>
                  </div>
                </div>
              </div>
              <div className="form-control">
                <label className="label label-text">
                  8. กระบือที่ได้รับรางวัลต้องมีคุณสมบัติครบถ้วน
                  หากตรวจพบว่าข้อมูลเป็นเท็จ จะตัดสิทธิ์ การได้รับรางวัล
                </label>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      {...register("accept8", { required: true })}
                    />
                    <span className="text-white">ยินยอม</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      {...register("accept8", { required: true })}
                    />
                    <span className="text-white">ไม่ยินยอม</span>
                  </div>
                </div>
              </div>
              <div className="form-control">
                <label className="label label-text">
                  9. ผู้สมัครรับรองความถูกต้องของข้อมูลนี้
                  และให้มีผลสมบูรณ์ตามกฎหมายทุกประการ
                </label>
                <div className="grid grid-cols-2 place-items-center gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="y"
                      {...register("accept9", { required: true })}
                    />
                    <span className="text-white">ยินยอม</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      className="radio"
                      value="n"
                      {...register("accept9", { required: true })}
                    />
                    <span className="text-white">ไม่ยินยอม</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button
            disabled={formSubmiting}
            type="submit"
            className="btn btn-primary btn-sm my-2"
          >
            {formSubmiting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="loading loading-spinner"></div>
                กำลังยืนยัน...
              </div>
            ) : (
              "ยืนยันการลงทะเบียน"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoyalForm;
