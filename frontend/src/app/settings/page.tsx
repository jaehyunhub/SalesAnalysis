"use client";

import { useState, useEffect, useCallback } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { eventsApi } from "@/lib/api";

type EventType = "holiday" | "school" | "local" | "other";

const eventTypeLabels: Record<EventType, string> = {
  holiday: "공휴일",
  school: "학교 행사",
  local: "지역 행사",
  other: "기타",
};

const eventTypeBadgeColors: Record<EventType, string> = {
  holiday: "bg-red-100 text-red-700",
  school: "bg-green-100 text-green-700",
  local: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

interface EventItem {
  id: number;
  user_id: number;
  event_date: string;
  event_type: EventType;
  description: string;
  created_at: string;
}

export default function SettingsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [syncingHolidays, setSyncingHolidays] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const [storeName, setStoreName] = useState("CU 강남역점");
  const [storeAddress, setStoreAddress] = useState("서울특별시 강남구 강남대로 123");
  const [storeInfoSaved, setStoreInfoSaved] = useState(false);

  const [form, setForm] = useState({
    event_type: "other" as EventType,
    description: "",
    event_date: "",
  });
  const [formError, setFormError] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      setError("");
      const res = await eventsApi.getAll();
      setEvents(res.data as EventItem[]);
    } catch {
      setError("이벤트 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleAddEvent = async () => {
    if (!form.description.trim()) {
      setFormError("설명을 입력해주세요.");
      return;
    }
    if (!form.event_date) {
      setFormError("날짜를 입력해주세요.");
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      await eventsApi.create({
        event_date: form.event_date,
        event_type: form.event_type,
        description: form.description.trim(),
      });
      setForm({ event_type: "other", description: "", event_date: "" });
      await fetchEvents();
    } catch {
      setFormError("이벤트 추가에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    setDeletingId(id);
    try {
      await eventsApi.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("이벤트 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSyncHolidays = async (year: number) => {
    setSyncingHolidays(true);
    setSyncMessage("");
    try {
      const res = await eventsApi.syncHolidays(year);
      setSyncMessage(res.data.message || `${res.data.synced_count}건의 공휴일이 등록되었습니다.`);
      await fetchEvents();
    } catch {
      setSyncMessage("공휴일 동기화에 실패했습니다.");
    } finally {
      setSyncingHolidays(false);
    }
  };

  const handleSaveStoreInfo = () => {
    setStoreInfoSaved(true);
    setTimeout(() => setStoreInfoSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Store info */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">점포 정보</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              점포명
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              주소
            </label>
            <input
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSaveStoreInfo}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            저장
          </button>
          {storeInfoSaved && (
            <span className="text-sm text-green-600 font-medium">저장되었습니다.</span>
          )}
        </div>
      </div>

      {/* Add event */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">이벤트 등록</h3>
        <p className="mb-4 text-sm text-gray-500">
          매출에 영향을 줄 수 있는 주변 이벤트를 등록하면 환경 변수 분석에 활용됩니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              이벤트 유형
            </label>
            <select
              value={form.event_type}
              onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value as EventType }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {(Object.keys(eventTypeLabels) as EventType[]).map((key) => (
                <option key={key} value={key}>
                  {eventTypeLabels[key]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              설명
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="예) 인근 초등학교 운동회"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              날짜
            </label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        {formError && (
          <p className="mt-2 text-xs text-red-500">{formError}</p>
        )}
        <div className="mt-4">
          <button
            onClick={handleAddEvent}
            disabled={submitting}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "추가 중..." : "이벤트 추가"}
          </button>
        </div>
      </div>

      {/* Event list */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-800">등록된 이벤트</h3>
            <span className="text-sm text-gray-500">총 {events.length}건</span>
          </div>
          <button
            onClick={() => handleSyncHolidays(new Date().getFullYear())}
            disabled={syncingHolidays}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncingHolidays ? "동기화 중..." : `공휴일 자동 등록 (${new Date().getFullYear()}년)`}
          </button>
        </div>

        {syncMessage && (
          <p className={`mb-3 text-sm ${syncMessage.includes("실패") ? "text-red-500" : "text-green-600"}`}>
            {syncMessage}
          </p>
        )}

        {error && (
          <p className="mb-3 text-sm text-red-500">{error}</p>
        )}

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">
            이벤트 목록을 불러오는 중...
          </div>
        ) : events.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            등록된 이벤트가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-3 pr-4 font-medium">유형</th>
                  <th className="pb-3 pr-4 font-medium">설명</th>
                  <th className="pb-3 pr-4 font-medium">날짜</th>
                  <th className="pb-3 font-medium text-right">삭제</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100 text-gray-700">
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${eventTypeBadgeColors[event.event_type] || "bg-gray-100 text-gray-700"}`}
                      >
                        {eventTypeLabels[event.event_type] || event.event_type}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{event.description}</td>
                    <td className="py-3 pr-4 text-gray-500">{event.event_date}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={deletingId === event.id}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
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
