import { useMutation, useQuery } from "convex/react"
import { PhoneIcon, PhoneOffIcon } from "lucide-react"
import { api } from "@/convex/_generated/api"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

export function Babble() {
  const currentUserBabble = useQuery(api.babbles.getCurrentUserActiveBabble)
  const activeBabble = useQuery(api.babbles.getActive)
  const joinBabble = useMutation(api.babbles.join)
  const leaveBabble = useMutation(api.babbles.leave)

  const isInBabble = !!currentUserBabble
  const hasActiveBabble = !!activeBabble

  const handleBabbleClick = async () => {
    try {
      if (currentUserBabble) {
        // User is in the babble, leave it
        void leaveBabble()
      } else {
        // Join the babble room
        void joinBabble()
      }
    } catch (error) {
      console.error(error)
    }
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
                {activeBabble.babblers.slice(0, 3).map((babbler: any) => (
                  <Avatar key={babbler.userId} className="size-4 border border-background">
                    <AvatarImage src={babbler.user.image || undefined} />
                    <AvatarFallback className="size-4 text-xs">{babbler.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
                {activeBabble.babblers.length > 3 && (
                  <div className="flex size-4 items-center justify-center rounded-full border border-background bg-muted text-xs">
                    +{activeBabble.babblers.length - 3}
                  </div>
                )}
              </div>
              <span className="ml-1 text-muted-foreground text-xs">
                {activeBabble.babblers.length} babbler{activeBabble.babblers.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isInBabble ? "destructive" : "default"}
              size="sm"
              onClick={handleBabbleClick}
              className="h-8 w-8 p-0"
            >
              {isInBabble ? <PhoneOffIcon className="h-4 w-4" /> : <PhoneIcon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isInBabble ? "Leave babble" : "Join babble"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
