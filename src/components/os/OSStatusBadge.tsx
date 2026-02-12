import React from 'react'
import { Badge, type BadgeColor } from '@/components/ui/Badge'

export type OSStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'COMPLETED' | 'CANCELED'

interface StatusConfig {
  label: string
  color: BadgeColor
}

const statusMap: Record<OSStatus, StatusConfig> = {
  DRAFT: {
    label: 'Rascunho',
    color: 'gray',
  },
  PENDING_SIGNATURE: {
    label: 'Aguardando Assinatura',
    color: 'amber',
  },
  COMPLETED: {
    label: 'Concluída',
    color: 'green',
  },
  CANCELED: {
    label: 'Cancelada',
    color: 'red',
  },
}

export interface OSStatusBadgeProps {
  status: OSStatus | string
  dot?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function OSStatusBadge({
  status,
  dot = true,
  size = 'md',
  className,
}: OSStatusBadgeProps) {
  const config = statusMap[status as OSStatus]

  if (!config) {
    return (
      <Badge color="gray" size={size} className={className}>
        {status}
      </Badge>
    )
  }

  return (
    <Badge color={config.color} dot={dot} size={size} className={className}>
      {config.label}
    </Badge>
  )
}

export default OSStatusBadge
