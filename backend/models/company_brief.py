from pydantic import BaseModel


class CompanyBriefSummary(BaseModel):
    one_liner: str = ""
    products_services: list[str] = []
    customers_users: list[str] = []
    positioning_claims: list[str] = []
    risk_areas: list[str] = []
    unknowns: list[str] = []
    generated_at: str = ""


class CompanyBriefRequest(BaseModel):
    company_url: str
    notes: str | None = None


class CompanyBriefResponse(BaseModel):
    company_brief_summary: CompanyBriefSummary
