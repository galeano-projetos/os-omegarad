import React from 'react'
import { cn } from '@/lib/utils'

const colorStyles = {
  gray: 'bg-dark-100 text-dark-600 ring-dark-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
} as const

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
} as const

export type BadgeColor = keyof typeof colorStyles
export type BadgeSize = keyof typeof sizeStyles

export interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  size?: BadgeSize
  dot?: boolean
  className?: string
}

export function Badge({
  children,
  color = 'gray',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full ring-1 ring-inset whitespace-nowrap',
        colorStyles[color],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            color === 'gray' && 'bg-dark-400',
            color === 'amber' && 'bg-amber-500',
            color === 'green' && 'bg-green-500',
            color === 'red' && 'bg-red-500',
            color === 'primary' && 'bg-primary',
            color === 'blue' && 'bg-blue-500'
          )}
        />
      )}
      {children}
    </span>
  )
}

export default Badge
