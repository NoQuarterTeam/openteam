import * as LabelPrimitive from "@radix-ui/react-label"
import * as React from "react"
import { cn } from "@/lib/utils"

function Label(props: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      {...props}
      className={cn(
        "flex select-none items-center gap-2 py-0.5 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        props.className,
      )}
    />
  )
}

export { Label }
