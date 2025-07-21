import { PauseIcon, PlayIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "./ui/button"

interface AudioPillProps {
  src: string
}

export function AudioPill({ src }: AudioPillProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      audio.play().catch((error) => {
        console.error("Audio playback failed:", error)
        console.log("Audio src:", audio.src)
        console.log("Audio readyState:", audio.readyState)
        console.log("Audio error:", audio.error)
        setIsPlaying(false)
        toast.error("Failed to play audio")
      })
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)
    const handleCanPlay = () => console.log("Audio can play")
    const handleError = (e: Event) => {
      console.error("Audio error event:", e)
      console.log("Audio error details:", audio.error)
      setIsPlaying(false)
    }
    const handleLoadStart = () => console.log("Audio load started")

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("error", handleError)
    audio.addEventListener("loadstart", handleLoadStart)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("error", handleError)
      audio.removeEventListener("loadstart", handleLoadStart)
    }
  }, [src])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickPosition = (e.clientX - rect.left) / rect.width
    const newTime = clickPosition * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="inline-flex w-[320px] items-center gap-3 rounded-lg border bg-muted/20 py-1 pr-10 pl-2 text-sm">
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button size="icon" onClick={togglePlayPause} variant="default" className="rounded-full">
        {isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
      </Button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
            onClick={handleSeek}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercentage}%` }} />
          </div>

          <span className="font-mono text-muted-foreground text-xs">
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function isAudio(file: { type?: string; name: string }): boolean {
  return file.type?.startsWith("audio/") || /\.(mp3|wav|ogg|webm|aac|flac|m4a)$/i.test(file.name)
}
