import { FileIcon } from "lucide-react"

export function FilePill({ name }: { name: string }) {
  return (
    <div className="inline-flex h-14 items-center gap-2 rounded-lg border bg-muted py-1 pr-4 pl-3 text-sm">
      <FileIcon className="size-4" />
      <span className="line-clamp-2 max-w-[150px]">{name}</span>
    </div>
  )
}
