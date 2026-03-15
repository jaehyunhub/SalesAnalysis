"use client";

import { useState } from "react";
import FileUploader from "@/components/upload/FileUploader";
import type { UploadHistory } from "@/types";

const mockHistory: UploadHistory[] = [
  {
    id: 1,
    file_name: "sales_202403.xlsx",
    file_type: "xlsx",
    record_count: 1523,
    status: "completed",
    created_at: "2024-03-14 14:30:22",
  },
  {
    id: 2,
    file_name: "sales_202402.csv",
    file_type: "csv",
    record_count: 1847,
    status: "completed",
    created_at: "2024-03-10 09:15:43",
  },
  {
    id: 3,
    file_name: "products_update.xlsx",
    file_type: "xlsx",
    record_count: 342,
    status: "completed",
    created_at: "2024-03-05 16:20:11",
  },
  {
    id: 4,
    file_name: "sales_202401.xlsx",
    file_type: "xlsx",
    record_count: 2104,
    status: "failed",
    created_at: "2024-02-28 11:05:33",
  },
];

export default function UploadPage() {
  const [history, setHistory] = useState<UploadHistory[]>(mockHistory);

  const handleUpload = async (file: File) => {
    // Mock upload delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newEntry: UploadHistory = {
      id: history.length + 1,
      file_name: file.name,
      file_type: file.name.split(".").pop() || "unknown",
      record_count: Math.floor(Math.random() * 2000) + 100,
      status: "completed",
      created_at: new Date().toLocaleString("ko-KR"),
    };

    setHistory((prev) => [newEntry, ...prev]);
  };

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

  return (
    <div className="space-y-6">
      {/* Uploader */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          파일 업로드
        </h3>
        <FileUploader onUpload={handleUpload} />
      </div>

      {/* Upload history */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          업로드 이력
        </h3>
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
      </div>
    </div>
  );
}
