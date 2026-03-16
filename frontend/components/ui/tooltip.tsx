'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, side = 'top', sideOffset = 6, style, ...props }, ref) => {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    const id = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(id)
  }, [])
  return (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        'group z-50 overflow-visible rounded-md bg-slate-900 px-3 py-2 text-sm text-white shadow-md',
        className
      )}
      style={{ opacity: ready ? 1 : 0, transition: 'none', ...style }}
      {...props}
    >
      {props.children}
      <TooltipPrimitive.Arrow className="fill-slate-900" width={10} height={5} />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
  )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
