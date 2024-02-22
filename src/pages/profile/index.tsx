import { useEffect } from "react";
import ProfileMenu from "~/components/Profile/Menu";
import RegisterForm from "~/components/Register/Form";
import { Profile } from "~/components/Register/Profile";
import Loading1 from "~/components/Shared/Loading1";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
import { useRouter } from "next/router";

export default function ProfilePage() {
  const { replace } = useRouter();
  const { loggedIn, profile } = useLine();
  const { data: user, isLoading } = api.user.getById.useQuery({
    userId: profile != undefined ? profile.userId : "",
  });

  useEffect(() => {
    if (!loggedIn) {
      void replace("/");
    }
  }, []);

  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center">
      {profile ? (
        <div className="grid-col-1 grid w-[220px] gap-10">
          <Profile
            avatar={profile.pictureUrl!}
            name={profile.displayName!}
            email={profile.email!}
          />
          {!isLoading ? (
            <div>
              {!user ? <RegisterForm profile={profile} /> : <ProfileMenu />}
            </div>
          ) : (
            <div className="text-center">
              <Loading1 />
            </div>
          )}
        </div>
      ) : (
        <Loading1 />
      )}
    </div>
  );
}
