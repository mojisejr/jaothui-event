import Link from "next/link";
import { type ReactNode, useEffect } from "react";
import { useLine } from "~/context/lineContext";
import { useRouter } from "next/router";
import { useAdmin } from "~/context/adminContext";
import {
  LuChevronRight,
  LuHistory,
  LuShieldCheck,
  LuTrophy,
  LuLogOut,
} from "react-icons/lu";

type MenuItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
};

function MenuItem({ href, label, icon }: MenuItemProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-white/10 bg-base-200 px-4 py-3 shadow-xl transition-colors duration-150 hover:bg-base-300"
    >
      <span className="flex items-center gap-3">
        <span className="text-buffalo-gold">{icon}</span>
        <span className="font-medium text-secondary">{label}</span>
      </span>
      <LuChevronRight className="text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function ProfileMenu() {
  const { logout, loggedIn } = useLine();
  const { replace } = useRouter();
  const { admin } = useAdmin();

  useEffect(() => {
    if (!loggedIn) {
      void replace("/");
    }
  }, [loggedIn, replace]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-300">
        เมนู
      </h3>

      <div className="flex flex-col gap-2">
        <MenuItem
          href="/profile/my-events"
          label="ประวัติลงประกวด"
          icon={<LuHistory size={18} />}
        />
        <MenuItem
          href="/events"
          label="รายการประกวดควาย"
          icon={<LuTrophy size={18} />}
        />
        {admin ? (
          <MenuItem
            href="/admin?tab=event"
            label="Admin Tools"
            icon={<LuShieldCheck size={18} />}
          />
        ) : null}
      </div>

      <div className="pt-1">
        <button
          onClick={() => logout()}
          className="group flex w-full items-center justify-between rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-error transition-colors duration-150 hover:bg-error/10"
        >
          <span className="flex items-center gap-3 font-medium">
            <LuLogOut size={18} />
            ออกจากระบบ
          </span>
          <LuChevronRight className="text-error/70 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
