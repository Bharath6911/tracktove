"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Searches" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-slate-950/80 backdrop-blur-lg md:hidden">
      <div className="mx-auto grid h-16 max-w-md grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 text-xs"
            >
              <item.icon
                className={`h-5 w-5 ${isActive ? "text-indigo-400" : "text-slate-400"}`}
              />
              <span className={isActive ? "text-indigo-300" : "text-slate-400"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
