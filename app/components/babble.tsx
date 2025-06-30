import { useMutation, useQuery } from "convex/react"
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { WebRTCService } from "@/lib/webrtc"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

export function Babble() {
  const user = useQuery(api.auth.loggedInUser)
  const [isMuted, setIsMuted] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const processedSignalsRef = useRef(new Set<string>())
  const webrtcServiceRef = useRef<WebRTCService | null>(null)

  const babblers = useQuery(api.babbles.getBabblers)
  const signals = useQuery(api.babbles.getSignals)

  const joinBabble = useMutation(api.babbles.join)
  const leaveBabble = useMutation(api.babbles.leave).withOptimisticUpdate((localStore) => {
    const currentValue = localStore.getQuery(api.babbles.getBabblers)
    if (currentValue) {
      localStore.setQuery(
        api.babbles.getBabblers,
        {},
        currentValue.filter((babbler) => babbler.userId !== user?._id),
      )
    }
  })
  const sendSignal = useMutation(api.babbles.sendSignal)
  const deleteSignal = useMutation(api.babbles.deleteSignal)

  const isInBabble = !!babblers?.find((babbler) => babbler.userId === user?._id)
  const isBabbling = (babblers?.length ?? 0) > 0

  // Initialize WebRTC service
  useEffect(() => {
    if (!webrtcServiceRef.current) {
      webrtcServiceRef.current = new WebRTCService({
        onSendSignal: async (targetUserId, signal) => {
          await sendSignal({ targetUserId, signal })
        },
      })
    }
  }, [])

  // Handle WebRTC signaling
  useEffect(() => {
    if (!signals || !isInBabble || !webrtcServiceRef.current) return

    for (const signal of signals) {
      if (processedSignalsRef.current.has(signal._id)) continue

      processedSignalsRef.current.add(signal._id)

      // Handle the signal
      void webrtcServiceRef.current.handleSignal(signal.fromUserId, signal.signal)

      // Delete the processed signal
      void deleteSignal({ signalId: signal._id })
    }
  }, [signals, isInBabble])

  // Set up WebRTC connections when joining babble
  useEffect(() => {
    if (!isInBabble || !babblers || !webrtcServiceRef.current) return

    const start = async () => {
      try {
        setIsConnecting(true)
        await webrtcServiceRef.current!.initializeAudio()

        // Connect to all other babblers
        const otherBabblers = babblers.filter((babbler) => babbler.userId !== user?._id)

        for (const babbler of otherBabblers) {
          // Create peer connection (current user is initiator if their ID is lexicographically smaller)
          const isInitiator = (user?._id || "") < babbler.userId

          await webrtcServiceRef.current!.connectToPeer(babbler.userId, isInitiator)
        }

        // play sound eventually using mp3
      } catch (error) {
        console.log(error)

        console.error("Failed to initialize WebRTC:", error)
        toast.error("Failed to connect audio")
      } finally {
        setIsConnecting(false)
      }
    }

    void start()

    return () => {
      webrtcServiceRef.current?.disconnectAll()
    }
  }, [isInBabble, babblers, user?._id])

  const handleBabbleClick = async () => {
    try {
      if (isInBabble) {
        void leaveBabble()
        webrtcServiceRef.current?.disconnectAll()
      } else {
        await joinBabble()
      }
    } catch (error) {
      console.error(error)
      toast.error("Error joining babble")
    }
  }

  const handleMuteToggle = () => {
    if (!webrtcServiceRef.current) return

    const newMuteState = webrtcServiceRef.current.toggleMute()
    setIsMuted(newMuteState)
  }

  return (
    <div className="rounded-md border px-2 py-1.5">
      <div className="flex items-center justify-between">
        {isBabbling || (babblers?.length && babblers.length > 0) ? (
          <Tooltip>
            <TooltipTrigger>
              <div className="mt-1 flex items-center gap-1">
                <div className="-space-x-3 flex items-center">
                  {babblers?.slice(0, 3).map((babbler, i) => (
                    <Avatar key={babbler.userId} className="size-7 border border-background" style={{ zIndex: 3 - i }}>
                      <AvatarImage src={babbler.user.image || undefined} className="object-cover" />
                      <AvatarFallback className="size-7 text-xs">{babbler.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {babblers?.length && babblers.length > 3 && <div className="text-xs">+{babblers.length - 3}</div>}
              </div>
            </TooltipTrigger>
            <TooltipContent align="start" className="py-2">
              {babblers?.map((babbler) => (
                <div key={babbler.userId} className="flex items-center gap-1">
                  <Avatar className="size-5">
                    <AvatarImage src={babbler.user.image || undefined} className="object-cover" />
                    <AvatarFallback className="size-5 text-xs">{babbler.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm">{babbler.user.name}</p>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        ) : (
          <p className="font-medium text-sm">Start Babbling</p>
        )}

        <div className="flex gap-1">
          {isInBabble && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={isMuted ? "destructive" : "outline"} size="icon" onClick={handleMuteToggle}>
                  {isMuted ? <MicOffIcon className="h-3 w-3" /> : <MicIcon className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isInBabble ? "destructive" : "outline"} size="icon" onClick={handleBabbleClick}>
                {isInBabble ? <PhoneOffIcon className="h-3 w-3" /> : <PhoneIcon className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isConnecting ? "Connecting..." : isInBabble ? "Leave" : "Join"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
