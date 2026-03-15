"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useAuthStore } from "@/store/authStore";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const publicPaths = ["/login", "/register"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isPublicPage = publicPaths.includes(pathname);

  return (
    <html lang="ko">
      <head>
        <title>ConveniSight - CU 편의점 매출 분석</title>
        <meta name="description" content="CU 편의점 매출 분석 플랫폼" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isPublicPage ? (
          children
        ) : (
          <div className="flex h-screen">
            <Sidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
            <div className="flex flex-1 flex-col lg:ml-[250px]">
              <Header onMenuClick={() => setSidebarOpen(true)} />
              <main className="flex-1 overflow-auto bg-gray-50 p-6">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
