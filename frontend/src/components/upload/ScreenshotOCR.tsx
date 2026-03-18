"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  CameraIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { uploadApi } from "@/lib/api";
import type { OCRRow } from "@/types";

interface ScreenshotOCRProps {
  onSaveSuccess: () => void;
}

export default function ScreenshotOCR({ onSaveSuccess }: ScreenshotOCRProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // OCR 결과
  const [saleDate, setSaleDate] = useState("");
  const [saleTime, setSaleTime] = useState("");
  const [rows, setRows] = useState<OCRRow[]>([]);
  const [rawText, setRawText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [showRawText, setShowRawText] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
    if (!allowedTypes.includes(file.type)) {
      setError("이미지 파일만 업로드할 수 있습니다. (jpg, png, webp, bmp)");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setRows([]);
    setRawText("");

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleOCR = async () => {
    if (!selectedFile) return;
    setProcessing(true);
    setError(null);

    try {
      const res = await uploadApi.uploadScreenshot(selectedFile);
      const data = res.data;
      setSaleDate(data.sale_date || new Date().toISOString().slice(0, 10));
      setSaleTime(data.sale_time || "");
      setRows(data.rows);
      setRawText(data.raw_text);
      setConfidence(data.confidence);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "OCR 처리 중 오류가 발생했습니다.");
      } else {
        setError("OCR 처리 중 오류가 발생했습니다.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      setError("저장할 상품 데이터가 없습니다.");
      return;
    }
    if (!saleDate) {
      setError("날짜를 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await uploadApi.confirmScreenshot({
        sale_date: saleDate,
        sale_time: saleTime || undefined,
        rows,
      });
      setSuccess(res.data.message);
      setRows([]);
      setRawText("");
      setPreview(null);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onSaveSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "저장 중 오류가 발생했습니다.");
      } else {
        setError("저장 중 오류가 발생했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (idx: number, field: keyof OCRRow, value: string | number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const deleteRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { product_name: "", quantity: 1, amount: 0 }]);
    setEditingIdx(rows.length);
  };

  const reset = () => {
    setPreview(null);
    setSelectedFile(null);
    setRows([]);
    setRawText("");
    setError(null);
    setSuccess(null);
    setConfidence(0);
    setSaleDate("");
    setSaleTime("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      {/* 이미지 업로드 영역 */}
      {!preview && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
          <CameraIcon className="mb-3 h-10 w-10 text-gray-400" />
          <p className="mb-1 text-sm font-medium text-gray-700">
            POS 스크린샷을 선택하세요
          </p>
          <p className="text-xs text-gray-400">
            지원 형식: jpg, png, webp, bmp
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 이미지 미리보기 */}
      {preview && (
        <div className="relative h-80 w-full">
          <Image
            src={preview}
            alt="POS 스크린샷"
            fill
            className="rounded-lg border border-gray-200 object-contain"
          />
          <button
            onClick={reset}
            className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow-md hover:bg-gray-100"
          >
            <XMarkIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* OCR 실행 버튼 */}
      {preview && rows.length === 0 && !processing && (
        <button
          onClick={handleOCR}
          className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          OCR 텍스트 인식 시작
        </button>
      )}

      {processing && (
        <div className="flex flex-col items-center gap-2 py-6">
          <LoadingSpinner size="md" />
          <p className="text-sm text-gray-500">이미지를 분석하고 있습니다...</p>
        </div>
      )}

      {/* OCR 결과 */}
      {rows.length > 0 && (
        <div className="space-y-4">
          {/* 신뢰도 + 날짜/시간 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">인식 신뢰도</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  confidence >= 0.7
                    ? "bg-green-100 text-green-700"
                    : confidence >= 0.4
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">날짜</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">시간</label>
              <input
                type="time"
                value={saleTime}
                onChange={(e) => setSaleTime(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 상품 테이블 */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">상품명</th>
                  <th className="px-4 py-3 font-medium text-right">수량</th>
                  <th className="px-4 py-3 font-medium text-right">금액</th>
                  <th className="px-4 py-3 font-medium text-center">편집</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 text-gray-700">
                    <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2">
                      {editingIdx === idx ? (
                        <input
                          type="text"
                          value={row.product_name}
                          onChange={(e) => updateRow(idx, "product_name", e.target.value)}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        row.product_name
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingIdx === idx ? (
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, "quantity", parseInt(e.target.value) || 0)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                          min={0}
                        />
                      ) : (
                        row.quantity
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingIdx === idx ? (
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => updateRow(idx, "amount", parseFloat(e.target.value) || 0)}
                          className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                          min={0}
                        />
                      ) : (
                        row.amount.toLocaleString() + "원"
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {editingIdx === idx ? (
                          <button
                            onClick={() => setEditingIdx(null)}
                            className="rounded p-1 text-green-500 hover:bg-green-50"
                            title="완료"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingIdx(idx)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-500"
                            title="편집"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteRow(idx)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                          title="삭제"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-medium text-gray-700">
                  <td className="px-4 py-2" colSpan={2}>
                    합계
                  </td>
                  <td className="px-4 py-2 text-right">
                    {rows.reduce((s, r) => s + r.quantity, 0)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {rows.reduce((s, r) => s + r.amount, 0).toLocaleString()}원
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 행 추가 버튼 */}
          <button
            onClick={addRow}
            className="text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            + 상품 행 추가
          </button>

          {/* 원본 텍스트 토글 */}
          <button
            onClick={() => setShowRawText(!showRawText)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {showRawText ? "원본 텍스트 숨기기" : "OCR 원본 텍스트 보기"}
          </button>
          {showRawText && (
            <pre className="max-h-48 overflow-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-600">
              {rawText}
            </pre>
          )}

          {/* 저장 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || rows.length === 0}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "매출 데이터로 저장"}
            </button>
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* 성공 */}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>
      )}
    </div>
  );
}
