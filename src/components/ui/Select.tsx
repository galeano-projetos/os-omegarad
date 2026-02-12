'use client'

import React, { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  placeholder?: string
  options?: SelectOption[]
  containerClassName?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      placeholder,
      options,
      containerClassName,
      className,
      id: externalId,
      disabled,
      children,
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
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              'block w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm text-dark-800',
              'appearance-none',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
                : 'border-dark-200 focus:border-primary focus:ring-primary/30',
              disabled && 'bg-dark-50 text-dark-400 cursor-not-allowed',
              !props.value && placeholder && 'text-dark-300',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${id}-error` : hint ? `${id}-hint` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-dark-400">
            <ChevronDown className="h-4 w-4" />
          </div>
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

Select.displayName = 'Select'

export { Select }
export default Select
