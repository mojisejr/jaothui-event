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
  d1Image: FileList;
  d2Image: FileList;
  d3Image: FileList;
  accept1: string;
  accept2: string;
  accept3: string;
  accept4: string;
  accept5: string;
  accept6: string;
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

  // const thaiDate = parseThaiDate(new Date(startAt).getTime());
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

  const onSubmitTest = handleSubmit(async () => {
    setSubmiting(true);
    setTimeout(() => {
      alert("done!");
      setSubmiting(false);
    }, 2000);
  });

  const onSubmit = handleSubmit(async (data) => {
    setSubmiting(true);
    if (
      data.accept1 == "n" ||
      data.accept2 == "n" ||
      data.accept3 == "n" ||
      data.accept4 == "n" ||
      data.accept5 == "n" ||
      data.accept6 == "n"
    ) {
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
      data.d1Image[0],
      data.d2Image[0],
      data.d3Image[0],
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
      imagesList[4]!,
      imagesList[5]!,
      imagesList[6]!,
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
      d1Image: uploadResults[4]?._id!,
      d2Image: uploadResults[5]?._id!,
      d3Image: uploadResults[6]?._id!,
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
        const end = dayjs(startAt);
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
              className="input input-sm input-bordered text-black"
              placeholder="ชื่อ"
              disabled={searching || registering}
              {...register("firstName", { required: true })}
            />
          </div>

          {/**lastName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-black"
              placeholder="นามสกุล"
              disabled={searching || registering}
              {...register("lastName", { required: true })}
            />
          </div>

          {/**tel */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-black"
              placeholder="เบอร์โทรติดต่อ"
              disabled={searching || registering}
              {...register("tel", { required: true })}
            />
          </div>

          {/**farmName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-black"
              placeholder="ชื่อฟาร์ม"
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
                  className="input input-sm input-bordered"
                  placeholder="บ้านเลขที่"
                  required
                ></input>
              </div>
              {/**province */}
              <div className="form-control">
                <select
                  defaultValue="0"
                  {...register("province", { required: true })}
                  className="select select-bordered select-sm"
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
                  className="select select-bordered select-sm"
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
                  className="select select-bordered select-sm"
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
                  className="input input-sm input-bordered"
                  placeholder="รหัสไปรษณี"
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

              {/**buffaloName */}
              <div className="form-control">
                <input
                  type="text"
                  className="input input-sm input-bordered text-black"
                  placeholder="ชื่อกระบือ"
                  disabled={searching || registering}
                  {...register("buffaloName", { required: true })}
                />
              </div>

              {/**date */}
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

              {/**buffaloColor */}
              <div className="form-control">
                <select
                  className="select select-sm text-black disabled:text-slate-300"
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
                  className="select select-sm text-black disabled:text-slate-300"
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
              className="input input-sm input-bordered text-black"
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
              className="input input-sm input-bordered text-black"
              placeholder="ชื่อพ่อ"
              required
              disabled={searching || registering}
              {...register("fatherName", { required: true })}
            />
          </div>

          {/**motherName */}
          <div className="form-control">
            <input
              type="text"
              className="input input-sm input-bordered text-black"
              placeholder="ชื่อแม่"
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
              <div className="label label-text">ภาพประจำตัวสัตว์</div>
              <input
                type="file"
                {...register("buffaloImage", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
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
              <div className="label label-text">เอกสารตรวจโรคแท้งติดต่อ</div>
              <input
                type="file"
                {...register("d1Image", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div>

            {/**d2Image */}
            <div className="form-control">
              <div className="label label-text">ใบรับรองการตรวจโครโมโซม</div>
              <input
                type="file"
                {...register("d2Image", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div>

            {/**d3Image */}
            <div className="form-control">
              <div className="label label-text">
                ใบรับรองการฉีดวัคซีน FMD และคอบวม
              </div>
              <input
                type="file"
                {...register("d3Image", { required: true })}
                className="file-input file-input-bordered file-input-sm text-black"
                required
              />
            </div>
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
            </div>
          </div>
          <button
            disabled={formSubmiting}
            type="submit"
            className="btn btn-primary btn-sm my-2"
          >
            {formSubmiting ? "กำลังยืนยัน" : "ยืนยันการลงทะเบียน"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoyalForm;
