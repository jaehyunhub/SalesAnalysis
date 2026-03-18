"""POS 스크린샷 OCR 서비스 — pytesseract + OpenCV 전처리."""

import re
from datetime import date, time
from typing import Optional

import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None  # type: ignore[assignment]

try:
    import pytesseract
except ImportError:
    pytesseract = None  # type: ignore[assignment]


# POS 영수증에서 흔히 나타나는 패턴
DATE_PATTERN = re.compile(
    r"(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})[일]?"
)
TIME_PATTERN = re.compile(r"(\d{1,2})\s*[:시]\s*(\d{2})")
# 상품 행: 상품명  수량  금액 (탭/공백 구분)
ITEM_PATTERN = re.compile(
    r"^(.{2,30}?)\s{2,}(\d{1,5})\s{2,}([\d,]+)$", re.MULTILINE
)
# 금액만 있는 행: 상품명  금액
ITEM_AMOUNT_PATTERN = re.compile(
    r"^(.{2,30}?)\s{2,}([\d,]+)$", re.MULTILINE
)


def _preprocess_image(image: Image.Image) -> Image.Image:
    """OCR 정확도를 높이기 위한 이미지 전처리."""
    if cv2 is None:
        return image.convert("L")

    img_array = np.array(image)

    # 그레이스케일 변환
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array

    # 노이즈 제거
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # 적응형 이진화 (POS 영수증에 효과적)
    binary = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8
    )

    # 선명화
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(binary, -1, kernel)

    return Image.fromarray(sharpened)


def _parse_amount(text: str) -> float:
    """문자열에서 금액을 파싱한다 (쉼표 제거)."""
    cleaned = text.replace(",", "").replace(" ", "")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _extract_date(text: str) -> Optional[date]:
    """텍스트에서 날짜를 추출한다."""
    match = DATE_PATTERN.search(text)
    if match:
        try:
            return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            pass
    return None


def _extract_time(text: str) -> Optional[time]:
    """텍스트에서 시간을 추출한다."""
    match = TIME_PATTERN.search(text)
    if match:
        try:
            return time(int(match.group(1)), int(match.group(2)))
        except ValueError:
            pass
    return None


def _extract_items(text: str) -> list[dict]:
    """OCR 텍스트에서 상품 행을 추출한다."""
    rows = []

    # 패턴 1: 상품명 + 수량 + 금액
    for match in ITEM_PATTERN.finditer(text):
        name = match.group(1).strip()
        quantity = int(match.group(2))
        amount = _parse_amount(match.group(3))
        if amount > 0 and name:
            rows.append({
                "product_name": name,
                "quantity": quantity,
                "amount": amount,
            })

    # 패턴 1에서 찾지 못한 경우 패턴 2 시도: 상품명 + 금액 (수량=1)
    if not rows:
        for match in ITEM_AMOUNT_PATTERN.finditer(text):
            name = match.group(1).strip()
            amount = _parse_amount(match.group(2))
            # 합계/소계 등 제외
            if amount > 0 and name and not any(
                kw in name for kw in ["합계", "소계", "총", "거스름", "카드", "현금", "부가세", "VAT"]
            ):
                rows.append({
                    "product_name": name,
                    "quantity": 1,
                    "amount": amount,
                })

    return rows


def process_screenshot(image: Image.Image) -> dict:
    """
    POS 스크린샷을 OCR 처리하여 구조화된 데이터를 반환한다.

    Returns:
        {
            "sale_date": "2026-03-17" or null,
            "sale_time": "14:30" or null,
            "rows": [{"product_name": str, "quantity": int, "amount": float}, ...],
            "raw_text": str,
            "confidence": float (0~1)
        }
    """
    if pytesseract is None:
        raise RuntimeError(
            "pytesseract가 설치되지 않았습니다. "
            "'pip install pytesseract'를 실행하고 Tesseract OCR을 설치해주세요."
        )

    # 이미지 전처리
    processed = _preprocess_image(image)

    # OCR 실행 (한국어 + 영어)
    custom_config = r"--oem 3 --psm 6"
    try:
        ocr_data = pytesseract.image_to_data(
            processed, lang="kor+eng", config=custom_config, output_type=pytesseract.Output.DICT
        )
    except Exception:
        # lang=kor 실패 시 eng만으로 재시도
        ocr_data = pytesseract.image_to_data(
            processed, lang="eng", config=custom_config, output_type=pytesseract.Output.DICT
        )

    # 신뢰도 계산
    confidences = [
        int(c) for c in ocr_data.get("conf", []) if str(c).lstrip("-").isdigit() and int(c) > 0
    ]
    avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0.0

    # 전체 텍스트 추출
    raw_text = pytesseract.image_to_string(
        processed, lang="kor+eng", config=custom_config
    ).strip()

    if not raw_text:
        # eng만으로 재시도
        raw_text = pytesseract.image_to_string(
            processed, lang="eng", config=custom_config
        ).strip()

    # 날짜/시간/상품 추출
    sale_date = _extract_date(raw_text)
    sale_time = _extract_time(raw_text)
    rows = _extract_items(raw_text)

    return {
        "sale_date": sale_date.isoformat() if sale_date else None,
        "sale_time": sale_time.strftime("%H:%M") if sale_time else None,
        "rows": rows,
        "raw_text": raw_text,
        "confidence": round(avg_confidence, 2),
    }
