import { NextRequest, NextResponse } from 'next/server'

// Kept for future OAuth providers if needed
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/', request.url))
}
