"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DocumentArrowUpIcon,
  CameraIcon,
} from "@heroicons/react/24/outline";
import FileUploader from "@/components/upload/FileUploader";
import ScreenshotOCR from "@/components/upload/ScreenshotOCR";
import { uploadApi } from "@/lib/api";
import type { UploadHistory } from "@/types";

type TabType = "file" | "screenshot";

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<TabType>("file");
  const [history, setHistory] = useState<UploadHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await uploadApi.getHistory();
      setHistory(res.data.items);
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            완료
          </span>
        );
      case "failed":
        return (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            실패
          </span>
        );
      case "processing":
        return (
          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
            처리중
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {status}
          </span>
        );
    }
  };

  const tabs = [
    { id: "file" as TabType, label: "파일 업로드", icon: DocumentArrowUpIcon },
    { id: "screenshot" as TabType, label: "스크린샷 OCR", icon: CameraIcon },
  ];

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="mb-5 flex gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "file" && (
          <FileUploader onUploadSuccess={fetchHistory} />
        )}
        {activeTab === "screenshot" && (
          <ScreenshotOCR onSaveSuccess={fetchHistory} />
        )}
      </div>

      {/* Upload history */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          업로드 이력
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-400">로딩 중...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-3 pr-4 font-medium">파일명</th>
                  <th className="pb-3 pr-4 font-medium">형식</th>
                  <th className="pb-3 pr-4 font-medium">레코드 수</th>
                  <th className="pb-3 pr-4 font-medium">상태</th>
                  <th className="pb-3 font-medium">업로드 일시</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      업로드 이력이 없습니다.
                    </td>
                  </tr>
                )}
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 text-gray-700"
                  >
                    <td className="py-3 pr-4 font-medium">{item.file_name}</td>
                    <td className="py-3 pr-4 uppercase">{item.file_type}</td>
                    <td className="py-3 pr-4">
                      {item.record_count.toLocaleString()}건
                    </td>
                    <td className="py-3 pr-4">{statusBadge(item.status)}</td>
                    <td className="py-3 text-gray-500">{item.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
