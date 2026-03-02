"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileJson,
  Key,
  List,
  TestTube,
  Sparkles,
  Play,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const NAV_GROUPS = [
  {
    label: "Settings",
    items: [
      { href: "/config", label: "Configuration", icon: FileJson },
      { href: "/env", label: "Environment Variables", icon: Key },
    ],
  },
  {
    label: "Data",
    items: [
      { href: "/jira", label: "Jira Issues", icon: List },
      { href: "/zephyr", label: "Zephyr Test Cases", icon: TestTube },
    ],
  },
  {
    label: "Workflow",
    items: [
      { href: "/workflow", label: "E2E Test Generation", icon: Sparkles },
      { href: "/e2e", label: "E2E Run", icon: Play },
    ],
  },
] as const;

const isActive = (pathname: string, href: string): boolean => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCloseSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={handleCloseSidebar}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar
          text-sidebar-foreground transition-transform duration-200 ease-out
          md:static md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4 md:justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-sidebar-foreground hover:text-sidebar-foreground"
            onClick={handleCloseSidebar}
          >
            <LayoutDashboard className="h-5 w-5" aria-hidden />
            Testflow Admin
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={handleCloseSidebar}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Main navigation">
          <div className="space-y-6">
            <div>
              <Link
                href="/"
                onClick={handleCloseSidebar}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === "/"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </Link>
            </div>
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={handleCloseSidebar}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
