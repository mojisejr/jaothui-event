import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type Profile } from "~/interfaces/Profile";
import { api } from "~/utils/api";

interface RegisterFormProp {
  profile: Profile;
  onSuccess?: () => void;
}

type RegisterInput = {
  firstname: string;
  lastname: string;
  tel: string;
};

export default function RegisterForm({ profile, onSuccess }: RegisterFormProp) {
  const { register, handleSubmit, formState } = useForm<RegisterInput>();

  const {
    mutate: createUser,
    isLoading,
    isSuccess,
    isError,
  } = api.user.create.useMutation();

  const { replace } = useRouter();

  useEffect(() => {
    if (isSuccess) {
      if (onSuccess) onSuccess();
      else void replace("/success");
    }
  }, [isSuccess, onSuccess, replace]);

  const onSubmit = handleSubmit((data) => {
    const preparedData = {
      userId: profile.userId,
      email: profile.email ?? null,
      name: `${data.firstname} ${data.lastname}`,
      tel: data.tel,
    };

    if (preparedData == undefined) return;
    createUser(preparedData);
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      {isError ? (
        <p role="alert">บันทึกไม่สำเร็จ กรุณาลองใหม่ ข้อมูลที่กรอกยังอยู่</p>
      ) : null}
      <div className="form-control">
        <label className="label label-text text-primary">ชื่อ</label>
        <input
          type="text"
          disabled={isLoading}
          required
          className="input input-sm input-bordered input-primary rounded-full"
          {...register("firstname", { required: true })}
        ></input>
      </div>
      <div className="form-control">
        <label className="label label-text text-primary">นามสกุล</label>
        <input
          type="text"
          disabled={isLoading}
          required
          className="input input-sm input-bordered input-primary rounded-full"
          {...register("lastname", { required: true })}
        ></input>
      </div>
      <div className="form-control">
        <label className="label label-text text-primary">โทรศัพท์</label>
        <input
          type="text"
          disabled={isLoading}
          required
          placeholder="0921234235"
          className="input input-sm input-bordered input-primary rounded-full"
          {...register("tel", { required: true })}
        ></input>
      </div>
      <button
        disabled={isLoading}
        type="submit"
        className="btn btn-primary my-2 rounded-full"
      >
        {isLoading ? (
          <div>
            <div className="loading loading-spinner loading-sm"></div>
          </div>
        ) : (
          "บันทึก"
        )}
      </button>
    </form>
  );
}
