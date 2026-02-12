import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: string
      clienteId: string | null
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: string
    clienteId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    clienteId: string | null
  }
}
