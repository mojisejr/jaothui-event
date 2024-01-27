interface ProfileProps {
  avatar: string;
  name: string;
  email: string;
}
export function Profile({ avatar, name, email }: ProfileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div>
        <img src={avatar} alt="avatar" className="w-36 rounded-full" />
      </div>
      <div className="flex flex-col items-center">
        <div className="text-xl font-semibold">{name}</div>
        <div className="text-sm font-bold text-slate-400">{email}</div>
      </div>
    </div>
  );
}
