type ProfileHeaderProps = {
  avatar: string;
  name: string;
  email?: string;
  activeBuffaloCount: number;
  activeEventCount: number;
  isStatsLoading?: boolean;
};

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-base-200 px-4 py-3 shadow-xl">
      <p className="text-xs font-medium text-slate-300">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none text-buffalo-gold">
        {loading ? "..." : value}
      </p>
    </div>
  );
}

export default function ProfileHeader({
  avatar,
  name,
  email,
  activeBuffaloCount,
  activeEventCount,
  isStatsLoading = false,
}: ProfileHeaderProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-base-200 p-4 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={avatar}
            alt="avatar"
            className="h-20 w-20 flex-shrink-0 rounded-full border-2 border-buffalo-gold/60 object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-secondary">{name}</p>
            {email ? (
              <p className="truncate text-sm font-medium text-slate-400">{email}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="ควายในรุ่น"
          value={activeBuffaloCount}
          loading={isStatsLoading}
        />
        <StatCard
          label="งานที่รอ"
          value={activeEventCount}
          loading={isStatsLoading}
        />
      </div>
    </div>
  );
}
