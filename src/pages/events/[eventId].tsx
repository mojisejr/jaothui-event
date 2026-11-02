import { useCallback } from "react";
import MemberRegisterForm from "~/components/Register/Form";
import { api } from "~/utils/api";
import { getCompetitionPolicy } from "~/server/services/competition-policy";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import FormV3 from "~/components/Events/Formv3";
import RoyalForm from "~/components/Events/RoyalForm";

export default function RegisterForm() {
  const { profile, authReady, loggedIn, login } = useLine();
  const { query } = useRouter();

  const { data: event, isLoading } = api.event.getById.useQuery(
    query.eventId as string,
    { enabled: typeof query.eventId === "string" },
  );
  const {
    data: member,
    isLoading: memberLoading,
    refetch: refetchMember,
    isError: memberError,
  } = api.user.getById.useQuery(
    { userId: profile?.userId ?? "" },
    { enabled: !!profile?.userId },
  );
  const memberCreated = useCallback(() => {
    void refetchMember();
  }, [refetchMember]);
  if (isLoading || !authReady) return <div className="p-6">กำลังโหลด...</div>;
  if (!event || getCompetitionPolicy(event).publicRegistration !== "open")
    return <div className="p-6">กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้</div>;
  if (!loggedIn || !profile)
    return (
      <div className="p-6">
        <button className="btn btn-primary" onClick={login}>
          เข้าสู่ระบบเพื่อลงทะเบียน
        </button>
      </div>
    );
  if (memberLoading) return <div className="p-6">กำลังโหลด...</div>;
  if (memberError)
    return (
      <div className="p-6">
        <p role="alert">โหลดข้อมูลสมาชิกไม่สำเร็จ กรุณาลองใหม่</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            void refetchMember();
          }}
        >
          โหลดใหม่
        </button>
      </div>
    );
  if (!member)
    return (
      <div className="p-6">
        <MemberRegisterForm profile={profile} onSuccess={memberCreated} />
      </div>
    );
  return (
    <div className="h-full max-h-[90vh] overflow-scroll p-6">
      {event.eventType === "royal" ? (
        <RoyalForm
          userId={profile ? profile.userId : ""}
          eventId={event.eventId}
          _startAt={event.eventAt}
          deadline={event.deadline}
          name={event.name}
        />
      ) : (
        <FormV3
          userId={profile ? profile.userId : ""}
          eventId={event.eventId}
          startAt={event.eventAt}
          deadline={event.deadline}
          name={event.name}
          isNational={
            event.metadata == null || event.metadata.includes("national")
          }
          isInHouse={
            event.metadata == null || event.metadata.includes("inhouse")
          }
        />
      )}
    </div>
  );
}
