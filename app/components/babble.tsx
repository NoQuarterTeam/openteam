import { useMutation, useQuery } from "convex/react"
import { HeadsetIcon, MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { WebRTCService } from "@/lib/webrtc"
import { Avatar } from "./ui/avatar"
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
        webrtcServiceRef.current?.disconnectAll()
        await leaveBabble()
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "h" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        void handleBabbleClick()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  if (!isInBabble && !isBabbling) {
    return (
      <Button variant="outline" onClick={handleBabbleClick}>
        Start Babble
        <HeadsetIcon />
      </Button>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-full border bg-background p-1.5 shadow-xs">
      <Babblers babblers={babblers} />
      <div className="flex items-center gap-1">
        {isInBabble && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isMuted ? "warning" : "outline"} size="icon" className="rounded-full" onClick={handleMuteToggle}>
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
          </Tooltip>
        )}
        {isInBabble ? (
          <Button variant="destructive" size="icon" className="rounded-full" onClick={handleBabbleClick}>
            <PhoneOffIcon />
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full" onClick={handleBabbleClick}>
                <HeadsetIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="px-2.5 pt-0.5">
              <div className="flex items-center justify-center">
                <kbd className="px-1 py-0.5 text-base">⌘</kbd>
                <kbd className="px-1 py-0.5 text-base">⇧</kbd>
                <kbd className="px-1 py-0.5 text-base">H</kbd>
              </div>
              <p>{isConnecting ? "Connecting..." : isInBabble ? "Leave" : "Join Babble"}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

function Babblers({ babblers }: { babblers: typeof api.babbles.getBabblers._returnType | undefined }) {
  return (
    <Tooltip open={babblers?.length && babblers.length < 3 ? false : undefined}>
      <TooltipTrigger>
        <div className="flex items-center gap-1">
          <div className="-space-x-3 flex items-center">
            {babblers?.slice(0, 3).map((babbler, i) => (
              <Avatar
                key={babbler.userId}
                image={babbler.user.image}
                name={babbler.user.name}
                className="size-8 border border-background"
                style={{ zIndex: 3 - i }}
              />
            ))}
          </div>
          {babblers?.length && babblers.length > 3 && <div className="text-xs">+{babblers.length - 3}</div>}
        </div>
      </TooltipTrigger>
      <TooltipContent align="start" className="py-2">
        {babblers?.map((babbler) => (
          <div key={babbler.userId} className="flex items-center gap-1">
            <Avatar image={babbler.user.image} name={babbler.user.name} className="size-5" />
            <p className="text-sm">{babbler.user.name}</p>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
