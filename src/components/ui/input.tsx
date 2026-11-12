import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// iOS PWA fix: readOnly truc zorgt dat het toetsenbord altijd verschijnt
function handleIosTouchStart(e: React.TouchEvent<HTMLInputElement>) {
  const el = e.currentTarget
  if (el.readOnly) {
    el.readOnly = false
    el.focus()
  }
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onTouchStart, ...props }, ref) => (
    <input
      type={type}
      readOnly
      onTouchStart={(e) => {
        handleIosTouchStart(e)
        onTouchStart?.(e)
      }}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'
