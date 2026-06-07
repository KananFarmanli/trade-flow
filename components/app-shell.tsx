"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { NAV } from "@/lib/nav";
import { roleLabel, type Role } from "@/lib/auth";

export function AppShell({
  role,
  fullName,
  children,
}: {
  role: Role;
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV[role];
  const home = `/${role}`;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center border-b px-5">
          <span className="text-lg font-semibold tracking-tight">TradeFlow</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== home && pathname.startsWith(it.href + "/")) || pathname === it.href;
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-2">
            <div className="truncate text-sm font-medium">{fullName}</div>
            <div className="text-xs text-muted-foreground">{roleLabel(role)}</div>
          </div>
          <Link
            href="/account"
            className="mb-2 block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Hesab / Şifrə
          </Link>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
