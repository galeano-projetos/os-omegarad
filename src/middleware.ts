import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Cliente só pode acessar /cliente/*
    if (token?.role === 'cliente' && !path.startsWith('/cliente') && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/cliente/os', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/os/:path*',
    '/cliente/:path*',
    '/clientes/:path*',
    '/config/:path*',
    '/api/os/:path*',
    '/api/clientes/:path*',
    '/api/equipamentos/:path*',
  ],
}
