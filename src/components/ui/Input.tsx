'use client'

import React, { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  containerClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      containerClassName,
      className,
      id: externalId,
      disabled,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const id = externalId ?? autoId

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-dark-700 mb-1"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-0.5">*</span>
            )}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-dark-800',
              'placeholder:text-dark-300',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
                : 'border-dark-200 focus:border-primary focus:ring-primary/30',
              icon && 'pl-10',
              disabled && 'bg-dark-50 text-dark-400 cursor-not-allowed',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${id}-error` : hint ? `${id}-hint` : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-dark-400">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export default Input
