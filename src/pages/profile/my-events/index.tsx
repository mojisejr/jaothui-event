import Loading1 from "~/components/Shared/Loading1";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
import { FaAddressCard } from "react-icons/fa";
import Link from "next/link";
import HistoryCard from "~/components/MyEvents/HistoryCard";

export default function MyEventPage() {
  const { profile } = useLine();
  const { data: events, isLoading } =
    api.registerEvent.getAllRegisteredBy.useQuery({
      userId: profile ? profile.userId : "",
    });

  return (
    <div className="container mx-auto px-4 py-6 min-h-screen">
      {/* Page Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-secondary mb-6 text-center">
        ประวัติการลงประกวดควาย
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loading1 />
        </div>
      ) : (
        <>
          {events && events.length <= 0 ? (
            /* Mobile-optimized empty state */
            <div className="flex flex-col items-center justify-center text-secondary min-h-[60vh] gap-6 px-4">
              <FaAddressCard 
                size={80} 
                className="text-primary" 
                aria-hidden="true"
              />
              <p className="text-xl sm:text-2xl font-semibold text-center">
                ไม่มีข้อมูล
              </p>
              <p className="text-sm sm:text-base text-center text-buffalo-cream max-w-md">
                คุณยังไม่มีประวัติการลงประกวด เริ่มต้นเลยตอนนี้!
              </p>
              <Link
                className="btn btn-primary rounded-full px-8 py-3 text-base sm:text-lg min-h-[44px] touch-manipulation"
                href="/events"
                aria-label="Go to events registration page"
              >
                ไปสมัคร
              </Link>
            </div>
          ) : (
            /* Mobile-first responsive grid */
            <div 
              className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="list"
              aria-label="Buffalo registration history"
            >
              {events?.map((event) => (
                <div key={event._id} role="listitem">
                  <HistoryCard event={event} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
