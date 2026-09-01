"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { logout } from "@/lib/actions/auth";

export function Sidebar({
  displayName,
  classAliases,
}: {
  displayName: string;
  classAliases: string[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-64 flex-col justify-between border-r border-gray-200 p-4 dark:border-gray-800">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold">Bridge Learning System</p>
          <p className="truncate text-xs text-gray-500">{displayName}</p>
        </div>

        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    "block rounded-md px-3 py-2 text-sm font-medium " +
                    (active
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800")
                  }
                >
                  {item.label}
                </Link>
                {item.href === "/classes" && (
                  <ul className="mt-1 ml-3 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-800">
                    {classAliases.map((alias) => (
                      <li key={alias} className="truncate text-sm text-gray-600 dark:text-gray-400">
                        {alias}
                      </li>
                    ))}
                    <li>
                      <Link
                        href="/classes"
                        className="text-sm text-gray-500 hover:underline"
                      >
                        + New Class
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Log out
        </button>
      </form>
    </nav>
  );
}
