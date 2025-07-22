import { cn } from "@/lib/utils"

interface AvatarProps {
  image?: string | null
  name: string
  className?: string
  style?: React.CSSProperties
}

export function Avatar({ image, name, className, style }: AvatarProps) {
  return image ? (
    <img src={image} className={cn("flex-shrink-0 rounded-lg object-cover", className)} style={style} alt={name} />
  ) : (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm",
        className,
      )}
      style={style}
    >
      {name.charAt(0)}
    </div>
  )
}

// Legacy exports for backward compatibility - deprecated
export const AvatarImage = Avatar
export const AvatarFallback = Avatar
