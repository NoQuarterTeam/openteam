import { PlayIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// Video thumbnail component that generates a canvas-based thumbnail
export function VideoThumbnail({ src, className }: { src: string; className?: string }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setError(false)
    setThumbnail(null)

    const generateThumbnail = () => {
      try {
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          console.error("Could not get canvas context")
          setError(true)
          return
        }

        // Ensure video has dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.error("Video has no dimensions")
          setError(true)
          return
        }

        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw the current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Convert canvas to data URL
        const dataURL = canvas.toDataURL("image/jpeg", 0.8)
        console.log("Generated thumbnail for video:", src)
        setThumbnail(dataURL)
      } catch (error) {
        console.error("Failed to generate video thumbnail:", error)
        setError(true)
      }
    }

    const handleLoadedMetadata = () => {
      // Seek to a good frame (1 second or 10% of duration)
      const seekTime = Math.min(1, video.duration * 0.1)
      video.currentTime = seekTime
    }

    const handleSeeked = () => {
      // Small delay to ensure frame is rendered
      setTimeout(generateThumbnail, 100)
    }

    const handleError = (e: Event) => {
      console.error("Video error:", e)
      setError(true)
    }

    const handleCanPlay = () => {
      // Fallback: if seeking doesn't work, generate thumbnail from current frame
      if (video.currentTime === 0) {
        setTimeout(generateThumbnail, 100)
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("seeked", handleSeeked)
    video.addEventListener("error", handleError)
    video.addEventListener("canplay", handleCanPlay)

    // Start loading
    video.load()

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("seeked", handleSeeked)
      video.removeEventListener("error", handleError)
      video.removeEventListener("canplay", handleCanPlay)
    }
  }, [src])

  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-muted", className)}>
      {/* Video element for thumbnail generation */}
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        muted
        className="pointer-events-none absolute opacity-0"
        crossOrigin="anonymous"
        playsInline
      />

      {/* Canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Display thumbnail or loading/error state */}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex size-10 items-center justify-center rounded-full bg-black">
            <PlayIcon className="size-4 text-white" />
          </div>
        </div>
      ) : (
        <>
          {thumbnail && <img src={thumbnail} alt="Video thumbnail" className="h-full w-full object-cover" />}
          <div className="group absolute inset-0 flex items-center justify-center bg-black/20 transition-colors ">
            <div className="flex size-10 items-center justify-center rounded-full bg-black group-hover:bg-black/60">
              <PlayIcon className="size-4 text-white" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
