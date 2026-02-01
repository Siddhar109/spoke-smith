import type { CompanyBriefSummary } from '@/lib/company/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface CompanyBriefRequest {
  company_url: string
  notes?: string
}

export interface CompanyBriefResponse {
  company_brief_summary: CompanyBriefSummary
}

export async function createCompanyBrief(
  data: CompanyBriefRequest
): Promise<CompanyBriefResponse> {
  const response = await fetch(`${API_URL}/api/company_brief`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const message =
      error?.detail || `Failed to create company brief: ${response.status}`
    throw new Error(message)
  }

  return response.json()
}
