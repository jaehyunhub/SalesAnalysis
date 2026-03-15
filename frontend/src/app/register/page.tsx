"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import type { RegisterRequest } from "@/types";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequest>();

  const onSubmit = async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);

    try {
      // Mock register
      await new Promise((resolve) => setTimeout(resolve, 800));

      login("mock-jwt-token-12345", {
        id: 1,
        email: data.email,
        store_name: data.store_name,
      });

      router.push("/dashboard");
    } catch {
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">ConveniSight</h1>
          <p className="mt-2 text-sm text-gray-500">
            CU 편의점 매출 분석 플랫폼
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100">
          <h2 className="mb-6 text-xl font-semibold text-gray-800">
            회원가입
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                type="email"
                {...register("email", {
                  required: "이메일을 입력해주세요",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "올바른 이메일 형식이 아닙니다",
                  },
                })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="example@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                type="password"
                {...register("password", {
                  required: "비밀번호를 입력해주세요",
                  minLength: {
                    value: 6,
                    message: "비밀번호는 6자 이상이어야 합니다",
                  },
                })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="비밀번호 입력"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                점포명
              </label>
              <input
                type="text"
                {...register("store_name", {
                  required: "점포명을 입력해주세요",
                })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="예: CU 강남점"
              />
              {errors.store_name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.store_name.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2a4a73] disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : "회원가입"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-500 hover:text-blue-600"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
