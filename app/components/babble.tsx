import { useMutation, useQuery } from "convex/react"
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon, Volume2Icon, VolumeXIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { webrtcService } from "@/lib/webrtc.client"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

export function Babble() {
  const user = useQuery(api.auth.loggedInUser)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const processedSignalsRef = useRef(new Set<string>())

  const activeBabble = useQuery(api.babbles.getActive)
  const signals = useQuery(api.babbles.getSignals)

  const joinBabble = useMutation(api.babbles.join)
  const leaveBabble = useMutation(api.babbles.leave)
  const sendSignal = useMutation(api.babbles.sendSignal)
  const deleteSignal = useMutation(api.babbles.deleteSignal)

  const isInBabble = !!activeBabble?.find((babbler) => babbler.userId === user?._id)
  const hasActiveBabble = (activeBabble?.length ?? 0) > 0

  // Handle WebRTC signaling
  useEffect(() => {
    if (!signals || !isInBabble) return

    for (const signal of signals) {
      if (processedSignalsRef.current.has(signal._id)) continue

      processedSignalsRef.current.add(signal._id)

      // Handle the signal
      webrtcService.handleSignal(signal.fromUserId, signal.signal)

      // Delete the processed signal
      void deleteSignal({ signalId: signal._id })
    }
  }, [signals, isInBabble])

  // Set up WebRTC connections when joining babble
  useEffect(() => {
    if (!isInBabble || !activeBabble) return

    const start = async () => {
      try {
        setIsConnecting(true)
        await webrtcService.initializeAudio()

        // Connect to all other babblers
        const otherBabblers = activeBabble.filter((babbler: any) => babbler.userId !== user?._id)

        for (const babbler of otherBabblers) {
          // Create peer connection (current user is initiator if their ID is lexicographically smaller)
          const isInitiator = (user?._id || "") < babbler.userId

          webrtcService.createPeer(babbler.userId, isInitiator, (signal) => {
            void sendSignal({
              targetUserId: babbler.userId as Id<"users">,
              signal,
            })
          })
        }

        // play sound eventually using mp3
      } catch (error) {
        console.error("Failed to initialize WebRTC:", error)
        toast.error("Failed to connect audio")
      } finally {
        setIsConnecting(false)
      }
    }

    void start()

    return () => {
      webrtcService.disconnect()
    }
  }, [isInBabble, activeBabble, user?._id])

  const handleBabbleClick = async () => {
    try {
      if (isInBabble) {
        webrtcService.disconnect()
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
    const newMuteState = webrtcService.toggleMute()
    setIsMuted(newMuteState)
  }

  const handleDeafenToggle = () => {
    const newDeafenState = webrtcService.toggleDeafen()
    setIsDeafened(newDeafenState)
  }

  return (
    <div className="rounded-md border border-muted-foreground/25 border-dashed p-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {isInBabble ? "In Babble" : hasActiveBabble ? "Babble Room" : "Join Babble"}
          </span>
          {hasActiveBabble && (
            <div className="mt-1 flex items-center gap-1">
              <div className="-space-x-1 flex">
                {activeBabble?.slice(0, 3).map((babbler: any) => (
                  <Avatar key={babbler.userId} className="size-4 border border-background">
                    <AvatarImage src={babbler.user.image || undefined} />
                    <AvatarFallback className="size-4 text-xs">{babbler.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
                {activeBabble?.length && activeBabble.length > 3 && (
                  <div className="flex size-4 items-center justify-center rounded-full border border-background bg-muted text-xs">
                    +{activeBabble.length - 3}
                  </div>
                )}
              </div>
              <span className="ml-1 text-muted-foreground text-xs">
                {activeBabble?.length} babbler{activeBabble?.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {isInBabble && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="sm"
                    onClick={handleMuteToggle}
                    className="h-6 w-6 p-0"
                  >
                    {isMuted ? <MicOffIcon className="h-3 w-3" /> : <MicIcon className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isDeafened ? "destructive" : "secondary"}
                    size="sm"
                    onClick={handleDeafenToggle}
                    className="h-6 w-6 p-0"
                  >
                    {isDeafened ? <VolumeXIcon className="h-3 w-3" /> : <Volume2Icon className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDeafened ? "Undeafen" : "Deafen"}</TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isInBabble ? "destructive" : "default"}
                size="sm"
                onClick={handleBabbleClick}
                disabled={isConnecting}
                className="h-6 w-6 p-0"
              >
                {isInBabble ? <PhoneOffIcon className="h-3 w-3" /> : <PhoneIcon className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isConnecting ? "Connecting..." : isInBabble ? "Leave babble" : "Join babble"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
