import {
  FileArchiveIcon,
  FileAudioIcon,
  FileChartColumnIncreasingIcon,
  FileCodeIcon,
  FileIcon,
  FileImageIcon,
  FileJsonIcon,
  FileQuestionIcon,
  FileSpreadsheetIcon,
  FileSymlinkIcon,
  FileTextIcon,
  FileVideoIcon,
} from "lucide-react"
import { useMemo } from "react"

export function FilePill({ name, src, isImage, type }: { name: string; src?: string | null; isImage: boolean; type: string }) {
  const { icon, typeText } = useFileTypes(type)

  return (
    <div className="inline-flex h-14 w-[280px] items-center gap-2 rounded-lg border bg-muted/50 pr-3 pl-2 text-sm">
      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border">
        {isImage && src ? <img src={src} alt={name} className="h-full object-cover" /> : icon}
      </div>
      <div className="flex-1 truncate pr-8">
        <p className="truncate">{name}</p>
        <p className="truncate text-muted-foreground text-xs">{typeText}</p>
      </div>
    </div>
  )
}

export function useFileTypes(type: string) {
  const icon = useMemo(() => {
    switch (type) {
      // Documents
      case "application/pdf":
        return <FileTextIcon className="size-4" />
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return <FileTextIcon className="size-4" />
      // Powerpoint
      case "application/vnd.ms-powerpoint":
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        return <FileChartColumnIncreasingIcon className="size-4" />
      // Spreadsheets
      case "X-IWORK-NUMBERS-SFFNUMBERS":
      case "application/vnd.ms-excel":
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return <FileSpreadsheetIcon className="size-4" />
      // Images
      case "image/jpeg":
      case "image/png":
      case "image/gif":
      case "image/webp":
      case "image/bmp":
      case "image/svg+xml":
      case "image/tiff":
      case "image/heic":
        return <FileImageIcon className="size-4" />
      // Video
      case "video/mp4":
      case "video/quicktime":
      case "video/x-msvideo":
      case "video/x-matroska":
      case "video/webm":
      case "video/ogg":
        return <FileVideoIcon className="size-4" />
      // Audio
      case "audio/mpeg":
      case "audio/wav":
      case "audio/ogg":
      case "audio/mp4":
      case "audio/webm":
      case "audio/aac":
      case "audio/flac":
        return <FileAudioIcon className="size-4" />
      // Archives
      case "application/zip":
      case "application/x-7z-compressed":
      case "application/x-rar-compressed":
      case "application/x-tar":
      case "application/gzip":
        return <FileArchiveIcon className="size-4" />
      // Code
      case "application/json":
        return <FileJsonIcon className="size-4" />
      case "text/html":
      case "text/css":
      case "text/javascript":
      case "application/javascript":
      case "application/x-sh":
      case "application/x-python-code":
      case "application/x-httpd-php":
      case "text/x-c":
      case "text/x-c++":
      case "text/x-java-source":
      case "text/x-go":
      case "text/x-rustsrc":
      case "text/x-typescript":
      case "text/x-markdown":
      case "text/markdown":
      case "text/x-yaml":
      case "text/x-shellscript":
        return <FileCodeIcon className="size-4" />
      // Symlinks/Shortcuts
      case "application/x-ms-shortcut":
      case "application/x-symlink":
        return <FileSymlinkIcon className="size-4" />
      // Fallback for unknown
      case "":
      case undefined:
        return <FileQuestionIcon className="size-4" />
      default: {
        // Heuristic: if type starts with image, video, audio, etc.
        if (type.startsWith("image/")) return <FileImageIcon className="size-4" />
        if (type.startsWith("video/")) return <FileVideoIcon className="size-4" />
        if (type.startsWith("audio/")) return <FileAudioIcon className="size-4" />
        if (type.startsWith("text/")) return <FileTextIcon className="size-4" />
        if (type.startsWith("application/json")) return <FileJsonIcon className="size-4" />
        if (type.includes("zip") || type.includes("tar") || type.includes("rar") || type.includes("7z"))
          return <FileArchiveIcon className="size-4" />
        return <FileIcon className="size-4" />
      }
    }
  }, [type])

  const typeText = useMemo(() => {
    switch (type) {
      case "application/pdf":
        return "PDF"
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "Word"
      case "application/vnd.ms-powerpoint":
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        return "PowerPoint"
      case "X-IWORK-NUMBERS-SFFNUMBERS":
      case "application/vnd.ms-excel":
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return "Excel"
      case "image/jpeg":
      case "image/png":
      case "image/gif":
      case "image/webp":
      case "image/bmp":
      case "image/svg+xml":
      case "image/tiff":
      case "image/heic":
        return type.split("/")[1]?.toUpperCase() || "Image"
      case "video/mp4":
      case "video/quicktime":
      case "video/x-msvideo":
      case "video/x-matroska":
      case "video/webm":
      case "video/ogg":
        return type.split("/")[1]?.toUpperCase() || "Video"
      case "audio/mpeg":
      case "audio/wav":
      case "audio/ogg":
      case "audio/mp4":
      case "audio/webm":
      case "audio/aac":
      case "audio/flac":
        return type.split("/")[1]?.toUpperCase() || "Audio"
      case "application/zip":
      case "application/x-7z-compressed":
      case "application/x-rar-compressed":
      case "application/x-tar":
      case "application/gzip":
        return "Archive"
      case "application/json":
        return "JSON"
      case "text/html":
        return "HTML"
      case "text/css":
        return "CSS"
      case "text/javascript":
      case "application/javascript":
        return "JavaScript"
      case "application/x-sh":
        return "Shell"
      case "application/x-python-code":
        return "Python"
      case "application/x-httpd-php":
        return "PHP"
      case "text/x-c":
        return "C"
      case "text/x-c++":
        return "C++"
      case "text/x-java-source":
        return "Java"
      case "text/x-go":
        return "Go"
      case "text/x-rustsrc":
        return "Rust"
      case "text/x-typescript":
        return "TypeScript"
      case "text/x-markdown":
      case "text/markdown":
        return "Markdown"
      case "text/x-yaml":
        return "YAML"
      case "text/x-shellscript":
        return "Shell"
      case "application/x-ms-shortcut":
      case "application/x-symlink":
        return "Shortcut"
      case "":
      case undefined:
        return "Unknown"
      default: {
        if (type.startsWith("image/")) return "Image"
        if (type.startsWith("video/")) return "Video"
        if (type.startsWith("audio/")) return "Audio"
        if (type.startsWith("text/")) return type.split("/")[1]?.toUpperCase() || "Text"
        if (type.startsWith("application/json")) return "JSON"
        if (type.includes("zip") || type.includes("tar") || type.includes("rar") || type.includes("7z")) return "Archive"
        return type.split("/")[1]?.toUpperCase() || "Unknown File"
      }
    }
  }, [type])

  return { icon, typeText }
}
