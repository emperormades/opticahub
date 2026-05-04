import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Sem gate de autenticação — modo offline / UI apenas. */
export default function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
