from pydantic import BaseModel


class DailySales(BaseModel):
    date: str
    total_amount: float
    total_quantity: int


class MonthlySales(BaseModel):
    year: int
    month: int
    total_amount: float
    total_quantity: int


class HourlySales(BaseModel):
    hour: int
    total_amount: float
    total_quantity: int


class CategorySales(BaseModel):
    category: str
    total_amount: float
    percentage: float


class TopProduct(BaseModel):
    name: str
    total_amount: float
    total_quantity: int


class SummaryResponse(BaseModel):
    today_amount: float
    yesterday_amount: float
    this_month_amount: float
    total_products: int
