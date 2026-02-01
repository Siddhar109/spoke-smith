'use client'

import type { CompanyBriefSummary } from '@/lib/company/types'
import type { Scenario, CounterpartyId, SituationId } from '@/lib/scenarios/types'
import { getApiBaseUrl } from '@/lib/runtimeEnv'

const API_URL = getApiBaseUrl()

export interface GenerateScenarioRequest {
  company_url?: string
  company_notes?: string
  company_brief_summary?: CompanyBriefSummary
  counterparty?: CounterpartyId
  situation?: SituationId
  question_count?: number
}

export interface GenerateScenarioResponse {
  scenario: Scenario
}

export async function generateScenario(
  req: GenerateScenarioRequest
): Promise<GenerateScenarioResponse> {
  const response = await fetch(`${API_URL}/api/scenario/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as any))
    throw new Error(
      errorData.detail || errorData.error || `Failed to generate scenario: ${response.status}`
    )
  }

  return (await response.json()) as GenerateScenarioResponse
}

