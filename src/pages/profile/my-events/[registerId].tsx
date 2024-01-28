import DetailTable from "~/components/MyEvents/DetailTable";
import Loading1 from "~/components/Shared/Loading1";
import { useLine } from "~/context/lineContext";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
export default function MyEventPage() {
  const { profile } = useLine();
  const { query } = useRouter();

  return (
    <div>
      <div className="flex max-h-[85vh] w-full flex-col gap-2 overflow-y-scroll p-4">
        <DetailTable registerId={parseInt(query?.registerId as string)} />
      </div>
    </div>
  );
}
