import Link from "next/link";

export default function AdminMenu() {
  return (
    <ul>
      <Link
        className="btn btn-primary w-full rounded-full"
        href="/admin?tab=event"
      >
        Admin
      </Link>
    </ul>
  );
}
