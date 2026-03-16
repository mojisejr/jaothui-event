import { useEffect } from "react";
import { motion } from "framer-motion";
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
  }, [loggedIn, refetch, replace, user]);

  const reveal = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center bg-base-100">
      {profile ? (
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.08 }}
          className="grid-col-1 grid w-full max-w-md gap-8 px-4 py-6"
        >
          <motion.div variants={reveal} transition={{ duration: 0.25 }}>
            <ProfileHeader
              avatar={profile.pictureUrl!}
              name={profile.displayName!}
              email={profile.email}
              activeBuffaloCount={profileStats?.activeBuffaloCount ?? 0}
              activeEventCount={profileStats?.activeEventCount ?? 0}
              isStatsLoading={profileStatsLoading}
            />
          </motion.div>

          <motion.div variants={reveal} transition={{ duration: 0.25, delay: 0.05 }}>
            {!isLoading ? (
              <div>
                {!user ? <RegisterForm profile={profile} /> : <ProfileMenu />}
              </div>
            ) : (
              <div className="text-center">
                <Loading1 />
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : (
        <Loading1 />
      )}
    </div>
  );
}
