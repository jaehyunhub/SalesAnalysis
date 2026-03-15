"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowUpTrayIcon,
  ChartPieIcon,
  TagIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "대시보드", href: "/dashboard", icon: ChartBarIcon },
  { name: "매출 조회", href: "/sales", icon: CurrencyDollarIcon },
  { name: "데이터 업로드", href: "/upload", icon: ArrowUpTrayIcon },
  { name: "분석", href: "/analysis", icon: ChartPieIcon },
  { name: "행사 분석", href: "/promotion", icon: TagIcon },
  { name: "설정", href: "/settings", icon: Cog6ToothIcon },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-[250px] flex-col bg-[#1e3a5f] text-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-wide">
            ConveniSight
          </Link>
          <button className="lg:hidden" onClick={onClose}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="border-t border-white/20 p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium">{user?.store_name || "CU 편의점"}</p>
            <p className="text-xs text-blue-200">{user?.email || "admin@example.com"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
