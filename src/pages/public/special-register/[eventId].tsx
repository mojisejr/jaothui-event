import { getCompetitionPolicy } from "~/server/services/competition-policy";
import { useRouter } from "next/router";
import { useLine } from "~/context/lineContext";
import RoyalForm from "~/components/Events/RoyalForm";
import { api } from "~/utils/api";
import Loading1 from "~/components/Shared/Loading1";
import dayjs from "dayjs";

export default function SpecialRegisterHack() {
  const { profile, login, loggedIn } = useLine();
  const { query } = useRouter();
  const eventId = query.eventId as string;

  // Fetch REAL event data to enforce security (Ignore query params for critical data)
  const { data: event, isLoading } = api.event.getById.useQuery(eventId, {
    enabled: !!eventId,
  });

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading1 />
      </div>
    );

  if (!event)
    return <div className="p-10 text-center text-white">ไม่พบกิจกรรม</div>;

  if (getCompetitionPolicy(event).publicRegistration !== "open") {
    return (
      <div className="p-10 text-center text-white">
        กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้
      </div>
    );
  }

  // Security Check: Target Event ID
  // Only allow the specific event requested by the owner
  if (eventId !== "44da822e-7ec6-4e82-b530-a2ef06759f24") {
    return (
      <div className="p-10 text-center text-red-500">
        Access Denied: This link is valid for a specific event only.
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-xl text-white">
          กรุณาเข้าสู่ระบบเพื่อสมัครใหม่ (Re-register)
        </h1>
        <button
          onClick={() => login()}
          className="btn btn-primary rounded-full px-8"
        >
          เข้าสู่ระบบ (Login)
        </button>
      </div>
    );
  }

  // Reuse RoyalForm with AUTHENTICATED props from DB
  return (
    <div className="h-full max-h-[90vh] overflow-scroll p-6">
      <div className="alert alert-warning mb-4 shadow-lg">
        <div>
          <h3 className="font-bold">สมัครใหม่อีกครั้ง (Re-registration)</h3>
          <div className="text-xs">
            ท่านได้รับสิทธิ์ให้แก้ไขข้อมูลและส่งใบสมัครใหม่
            กรุณาตรวจสอบความถูกต้องก่อนกดส่ง
          </div>
        </div>
      </div>
      <RoyalForm
        userId={profile ? profile.userId : ""}
        eventId={event.eventId}
        _startAt={dayjs(event.eventAt).toString()}
        deadline={dayjs(event.deadline).toString()} // buffaloAgeDeadline
        name={event.name}
      />
    </div>
  );
}
