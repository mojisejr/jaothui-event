import DetailTable from "~/components/MyEvents/DetailTable";
import { useLine } from "~/context/lineContext";
import { useRouter } from "next/router";
export default function MyEventPage() {
  const { query } = useRouter();

  return (
    <div>
      <div className="flex max-h-[85vh] w-full flex-col gap-2 overflow-y-scroll p-4">
        <DetailTable registerId={parseInt(query?.registerId as string)} />
      </div>
    </div>
  );
}
