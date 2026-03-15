"use client";

import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

type EventType =
  | "school_sports"
  | "school_festival"
  | "school_exam"
  | "school_vacation"
  | "local_festival"
  | "marathon"
  | "construction"
  | "other";

const eventTypeLabels: Record<EventType, string> = {
  school_sports: "학교 체육대회",
  school_festival: "학교 축제",
  school_exam: "시험 기간",
  school_vacation: "방학",
  local_festival: "지역 축제",
  marathon: "마라톤",
  construction: "도로 공사",
  other: "기타",
};

const eventTypeBadgeColors: Record<EventType, string> = {
  school_sports: "bg-blue-100 text-blue-700",
  school_festival: "bg-purple-100 text-purple-700",
  school_exam: "bg-red-100 text-red-700",
  school_vacation: "bg-green-100 text-green-700",
  local_festival: "bg-yellow-100 text-yellow-700",
  marathon: "bg-orange-100 text-orange-700",
  construction: "bg-gray-100 text-gray-700",
  other: "bg-slate-100 text-slate-700",
};

interface Event {
  id: number;
  type: EventType;
  description: string;
  start_date: string;
  end_date: string;
}

const mockEvents: Event[] = [
  {
    id: 1,
    type: "school_festival",
    description: "인근 고등학교 축제",
    start_date: "2024-05-15",
    end_date: "2024-05-17",
  },
  {
    id: 2,
    type: "school_exam",
    description: "중간고사 기간",
    start_date: "2024-04-08",
    end_date: "2024-04-12",
  },
  {
    id: 3,
    type: "local_festival",
    description: "동네 봄 축제",
    start_date: "2024-04-20",
    end_date: "2024-04-21",
  },
  {
    id: 4,
    type: "construction",
    description: "점포 앞 도로 공사",
    start_date: "2024-03-01",
    end_date: "2024-04-30",
  },
];

export default function SettingsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [storeName, setStoreName] = useState("CU 강남역점");
  const [storeAddress, setStoreAddress] = useState("서울특별시 강남구 강남대로 123");
  const [storeInfoSaved, setStoreInfoSaved] = useState(false);

  const [form, setForm] = useState({
    type: "school_sports" as EventType,
    description: "",
    start_date: "",
    end_date: "",
  });
  const [formError, setFormError] = useState("");

  const handleAddEvent = () => {
    if (!form.description.trim()) {
      setFormError("설명을 입력해주세요.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      setFormError("시작일과 종료일을 모두 입력해주세요.");
      return;
    }
    if (form.start_date > form.end_date) {
      setFormError("종료일은 시작일 이후여야 합니다.");
      return;
    }

    const newEvent: Event = {
      id: Date.now(),
      type: form.type,
      description: form.description.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
    };
    setEvents((prev) => [newEvent, ...prev]);
    setForm({ type: "school_sports", description: "", start_date: "", end_date: "" });
    setFormError("");
  };

  const handleDeleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              이벤트 유형
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))}
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
              시작일
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              종료일
            </label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
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
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            이벤트 추가
          </button>
        </div>
      </div>

      {/* Event list */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">등록된 이벤트</h3>
          <span className="text-sm text-gray-500">총 {events.length}건</span>
        </div>

        {events.length === 0 ? (
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
                  <th className="pb-3 pr-4 font-medium">시작일</th>
                  <th className="pb-3 pr-4 font-medium">종료일</th>
                  <th className="pb-3 font-medium text-right">삭제</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100 text-gray-700">
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${eventTypeBadgeColors[event.type]}`}
                      >
                        {eventTypeLabels[event.type]}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{event.description}</td>
                    <td className="py-3 pr-4 text-gray-500">{event.start_date}</td>
                    <td className="py-3 pr-4 text-gray-500">{event.end_date}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
