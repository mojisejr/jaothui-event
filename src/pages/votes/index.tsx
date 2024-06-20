import Link from "next/link";
import { FaAddressCard } from "react-icons/fa";
import Loading1 from "~/components/Shared/Loading1";
import { api } from "~/utils/api";
export default function VotesPage() {
  const { data: voteEvent, isLoading } = api.votes.getAllEvents.useQuery();

  return (
    <div className="min-h-screen text-primary">
      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loading1 />
        </div>
      ) : (
        <>
          {voteEvent && voteEvent.length <= 0 ? (
            <div className="flex h-screen w-full flex-col items-center justify-center text-secondary">
              <FaAddressCard size={65} className="text-primary" />
              <p className="text-2xl">ไม่มีข้อมูล</p>
            </div>
          ) : (
            <div className="p-2">
              {voteEvent?.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-primary p-2  text-white"
                >
                  <div>{event.name}</div>
                  <Link
                    className="btn btn-secondary"
                    href={`/votes/${event._id}`}
                  >
                    ไปโหวต
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
