import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");
const BACKEND_URL = "http://localhost:8000";

async function globalSetup() {
  // 백엔드 API에 직접 로그인 요청
  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@conveni.com", password: "demo1234" }),
  });

  let accessToken: string | null = null;

  if (response.ok) {
    const data = await response.json();
    accessToken = data.access_token ?? null;
  } else {
    console.warn(
      `[auth.fixture] 로그인 실패 (status: ${response.status}). 빈 storageState로 진행합니다.`
    );
  }

  // storageState 파일 생성
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:3000",
        // auth.ts의 TOKEN_KEY("convenisight_token")와 USER_KEY("convenisight_user")를 주입
        localStorage: accessToken
          ? [
              { name: "convenisight_token", value: accessToken },
              {
                name: "convenisight_user",
                value: JSON.stringify({
                  id: 1,
                  email: "demo@conveni.com",
                  store_name: "CU 강남역점",
                }),
              },
            ]
          : [],
      },
    ],
  };

  // .auth 디렉터리 보장
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
  console.log(`[auth.fixture] storageState 저장 완료: ${AUTH_FILE}`);

  // 브라우저 컨텍스트를 통해 저장 상태 검증 (선택적)
  if (accessToken) {
    const browser = await chromium.launch();
    const context = await browser.newContext({ storageState: AUTH_FILE });
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
