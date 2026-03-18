const BASE_URL = "http://localhost:8000";

/**
 * 백엔드 API에 로그인 요청을 보내고 access_token을 반환합니다.
 */
export async function getAuthToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@conveni.com", password: "demo1234" }),
  });

  if (!response.ok) {
    throw new Error(
      `[api-helpers] 로그인 실패: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("[api-helpers] 응답에 access_token이 없습니다.");
  }

  return data.access_token as string;
}

/**
 * Authorization Bearer 헤더를 포함한 헤더 객체를 반환합니다.
 */
export function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
