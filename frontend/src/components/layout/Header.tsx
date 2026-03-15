"use client";

import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/outline";

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/sales": "매출 조회",
  "/upload": "데이터 업로드",
  "/analysis": "분석",
  "/promotion": "행사 분석",
  "/settings": "설정",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const title = pageTitles[pathname] || "ConveniSight";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <button className="lg:hidden" onClick={onMenuClick}>
          <Bars3Icon className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <UserCircleIcon className="h-8 w-8 text-gray-400" />
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-700">
            {user?.store_name || "CU 편의점"}
          </p>
          <p className="text-xs text-gray-500">{user?.email || "admin@example.com"}</p>
        </div>
      </div>
    </header>
  );
}
