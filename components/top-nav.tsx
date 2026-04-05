"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "主页" },
  { href: "/dashboard", label: "仪表盘" },
  { href: "/logs", label: "Log" },
  { href: "/external-api-docs", label: "API 文档" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-black/6 bg-[rgba(255,252,245,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-[0.16em] text-stone-700">
          KEYRELAY
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-stone-900/10 bg-white/70 p-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm ${
                  active
                    ? "bg-stone-900 text-stone-50"
                    : "text-stone-700 hover:bg-stone-900/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}