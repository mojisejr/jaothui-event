import { useEffect } from "react";
import ProfileMenu from "~/components/Profile/Menu";
import ProfileHeader from "~/components/Profile/ProfileHeader";
import RegisterForm from "~/components/Register/Form";
import Loading1 from "~/components/Shared/Loading1";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
import { useRouter } from "next/router";

export default function ProfilePage() {
  const { replace } = useRouter();
  const { loggedIn, profile } = useLine();
  const profileUserId = profile?.userId ?? "";

  const {
    data: user,
    isLoading,
    refetch,
  } = api.user.getById.useQuery({
    userId: profile?.userId!,
  });

  const { data: profileStats, isLoading: profileStatsLoading } =
    api.user.getProfileStats.useQuery(
    { userId: profileUserId },
    { enabled: Boolean(profileUserId) },
  );

  useEffect(() => {
    if (!loggedIn) {
      void replace("/");
    }
    if (!user) {
      refetch();
    }
  }, [user]);

  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center">
      {profile ? (
        <div className="grid-col-1 grid w-full max-w-md gap-8 px-4 py-6">
          <ProfileHeader
            avatar={profile.pictureUrl!}
            name={profile.displayName!}
            email={profile.email}
            activeBuffaloCount={profileStats?.activeBuffaloCount ?? 0}
            activeEventCount={profileStats?.activeEventCount ?? 0}
            isStatsLoading={profileStatsLoading}
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
