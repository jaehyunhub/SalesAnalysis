"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import type { LoginRequest } from "@/types";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(data);
      login(response.data.access_token, response.data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || "이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
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
          <h2 className="mb-6 text-xl font-semibold text-gray-800">로그인</h2>

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
              {loading ? <LoadingSpinner size="sm" /> : "로그인"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            계정이 없으신가요?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-500 hover:text-blue-600"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
