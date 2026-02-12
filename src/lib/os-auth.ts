import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export interface OSPermissions {
  userId: string
  role: string
  clienteId: string | null
  canCreate: boolean
  canEdit: boolean
  canView: boolean
  canDelete: boolean
  canSign: boolean
  isAdmin: boolean
}

export async function getOSSession(): Promise<OSPermissions | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user) return null

  const user = session.user as any
  const role = user.role as string

  return {
    userId: user.id,
    role,
    clienteId: user.clienteId || null,
    canCreate: ['admin', 'colaborador', 'tecnico'].includes(role),
    canEdit: ['admin', 'colaborador', 'tecnico'].includes(role),
    canView: true,
    canDelete: ['admin', 'colaborador', 'tecnico'].includes(role),
    canSign: true,
    isAdmin: role === 'admin',
  }
}
