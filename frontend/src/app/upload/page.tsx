"use client";

import { useState, useEffect, useCallback } from "react";
import FileUploader from "@/components/upload/FileUploader";
import { uploadApi } from "@/lib/api";
import type { UploadHistory } from "@/types";

export default function UploadPage() {
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

  return (
    <div className="space-y-6">
      {/* Uploader */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          파일 업로드
        </h3>
        <FileUploader onUploadSuccess={fetchHistory} />
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
