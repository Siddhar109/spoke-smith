import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

function getBackendBaseUrl(): string | undefined {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    undefined
  )
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function stripHopByHopHeaders(headers: Headers): Headers {
  const stripped = new Headers(headers)
  stripped.delete('connection')
  stripped.delete('keep-alive')
  stripped.delete('proxy-authenticate')
  stripped.delete('proxy-authorization')
  stripped.delete('te')
  stripped.delete('trailer')
  stripped.delete('transfer-encoding')
  stripped.delete('upgrade')
  stripped.delete('host')
  return stripped
}

async function proxy(request: NextRequest): Promise<Response> {
  const backendBaseUrl = getBackendBaseUrl()
  if (!backendBaseUrl) {
    return jsonError(
      500,
      'Backend URL not configured. Set BACKEND_API_URL (or API_URL).'
    )
  }

  const targetUrl = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    backendBaseUrl
  )

  const headers = stripHopByHopHeaders(request.headers)
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer()

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  })

  const responseHeaders = stripHopByHopHeaders(upstream.headers)
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest): Promise<Response> {
  return proxy(request)
}

export async function POST(request: NextRequest): Promise<Response> {
  return proxy(request)
}

export async function PUT(request: NextRequest): Promise<Response> {
  return proxy(request)
}

export async function PATCH(request: NextRequest): Promise<Response> {
  return proxy(request)
}

export async function DELETE(request: NextRequest): Promise<Response> {
  return proxy(request)
}

export async function OPTIONS(request: NextRequest): Promise<Response> {
  return proxy(request)
}

