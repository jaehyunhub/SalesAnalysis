"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUpTrayIcon, DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "@/components/common/LoadingSpinner";

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
}

export default function FileUploader({ onUpload }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];
  const allowedExtensions = [".xlsx", ".csv", ".xls"];

  const validateFile = (file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext) && !allowedTypes.includes(file.type)) {
      setError("지원하지 않는 파일 형식입니다. .xlsx 또는 .csv 파일만 업로드 가능합니다.");
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("파일 크기가 50MB를 초과합니다.");
      return false;
    }
    return true;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    setSuccess(false);

    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate upload progress for mock
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(selectedFile);

      clearInterval(interval);
      setProgress(100);
      setSuccess(true);
      setSelectedFile(null);
    } catch {
      setError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <ArrowUpTrayIcon className="mb-3 h-10 w-10 text-gray-400" />
        <p className="mb-1 text-sm font-medium text-gray-700">
          파일을 드래그하여 놓거나
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-semibold text-blue-500 hover:text-blue-600"
        >
          파일 선택
        </button>
        <p className="mt-2 text-xs text-gray-400">
          지원 형식: .xlsx, .csv (최대 50MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Selected file */}
      {selectedFile && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <DocumentIcon className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!uploading && (
              <button
                onClick={removeFile}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">업로드 중...</span>
            <span className="font-medium text-blue-500">{progress}%</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-600">
          파일이 성공적으로 업로드되었습니다.
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !uploading && (
        <button
          onClick={handleUpload}
          className="mt-4 w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
        >
          업로드 시작
        </button>
      )}

      {uploading && (
        <div className="mt-4 flex justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}
    </div>
  );
}
