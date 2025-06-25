"use client"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderIcon } from "lucide-react"
import type * as React from "react"
import { cn } from "@/lib/utils"

const spinnerStyles = cva("animate-spin", {
  variants: {
    size: {
      xs: "w-3 h-3",
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-7 h-7",
    },
    color: {
      white: "text-white dark:text-black",
      black: "text-black dark:text-white",
    },
  },
  defaultVariants: {
    color: "black",
    size: "md",
  },
})

export type SpinnerStyleProps = VariantProps<typeof spinnerStyles>
export type SpinnerProps = React.SVGProps<SVGSVGElement> & SpinnerStyleProps

export function Spinner({ size, color = "black", ...props }: SpinnerProps) {
  return <LoaderIcon className={cn(spinnerStyles({ size, color }), props.className)} />
}
