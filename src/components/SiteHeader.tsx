"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

export const NAV = [
  { href: "/lessons/", label: "บทเรียน" },
  { href: "/labs/", label: "Labs" },
  { href: "/cli/", label: "VRP CLI" },
  { href: "/mock/", label: "Mock Test" },
  { href: "/review/", label: "ทบทวน" },
  { href: "/about/", label: "เกี่ยวกับ" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href) || pathname + "/" === href;
}

export default function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-mono text-sm text-accent-fg">
            DC
          </span>
          <span className="leading-tight">
            HCIA-Datacom <span className="text-muted">Prep</span>
          </span>
        </Link>

        <nav aria-label="เมนูหลัก" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                isActive(pathname, item.href)
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <ThemeToggle />
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="เปิดเมนู"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden className="text-lg leading-none">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="เมนูหลัก (มือถือ)" className="border-t border-border bg-surface md:hidden">
          <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-1 p-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-md px-3 py-2.5 ${
                    isActive(pathname, item.href) ? "bg-accent-soft font-medium text-accent" : "hover:bg-surface-2"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
