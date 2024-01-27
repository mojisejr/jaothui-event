import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Profile } from "~/interfaces/Profile";
import { api } from "~/utils/api";

interface RegisterFormProp {
  profile: Profile;
}

type RegisterInput = {
  firstname: string;
  lastname: string;
  tel: string;
};

export default function RegisterForm({ profile }: RegisterFormProp) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterInput>();

  const {
    mutate: createUser,
    isLoading,
    isSuccess,
    isError,
  } = api.user.create.useMutation();

  const { replace } = useRouter();

  useEffect(() => {
    if (isSuccess) {
      replace("/profile/success");
    }

    if (isError) {
      replace("/profile/error");
    }
  }, [isSuccess, isError]);

  const onSubmit = handleSubmit((data) => {
    const preparedData = {
      userId: profile.userId,
      email: profile.email!,
      name: `${data.firstname} ${data.lastname}`,
      tel: data.tel,
    };

    if (preparedData == undefined) return;
    createUser(preparedData);
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <h3 className="text-center font-bold underline">ลงทะเบียนสมาชิก</h3>
      <div className="form-control">
        <label className="label label-text">ชื่อ</label>
        <input
          type="text"
          disabled={isLoading}
          required
          className="input input-bordered input-primary input-sm rounded-full"
          {...register("firstname", { required: true })}
        ></input>
      </div>
      <div className="form-control">
        <label className="label label-text">นามสกุล</label>
        <input
          type="text"
          disabled={isLoading}
          required
          className="input input-bordered input-primary input-sm rounded-full"
          {...register("lastname", { required: true })}
        ></input>
      </div>
      <div className="form-control">
        <label className="label label-text">โทรศัพท์</label>
        <input
          type="text"
          disabled={isLoading}
          required
          placeholder="0921234235"
          className="input input-bordered input-primary input-sm rounded-full"
          {...register("tel", { required: true })}
        ></input>
      </div>
      <button disabled={isLoading} type="submit" className="btn btn-primary">
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
