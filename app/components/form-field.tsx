import { useId } from "react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

export function FormField({
  label,
  error,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "error"> & { label: string; error?: string | string[] | null }) {
  const id = useId()
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} error={!!error} />
      {error && <p className="whitespace-pre text-destructive text-sm">{Array.isArray(error) ? error.join("\n") : error}</p>}
    </div>
  )
}
