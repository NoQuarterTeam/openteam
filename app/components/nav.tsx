import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { CommandCenter } from "./command-center"
import { ProfileModal } from "./profile-modal"
import { SignOutButton } from "./sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"

export function Nav() {
  const user = useQuery(api.auth.loggedInUser)
  const displayName = user?.name || user?.email

  return (
    <header className="flex h-12 items-center justify-between gap-4 border-b bg-background px-4">
      <div className="flex items-center gap-2 ">
        <h1 className="font-bold text-xl">OpenTeam</h1>
      </div>
      <div className="w-full max-w-2xl">
        <CommandCenter />
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded">
              <Avatar className="size-8 rounded">
                <AvatarImage src={user?.image || undefined} className="object-cover" />
                <AvatarFallback className="size-8 rounded text-black dark:text-white">{displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="pl-2">
              <p className="text-xs">{displayName}</p>
            </div>
            <DropdownMenuSeparator />
            <ProfileModal />
            <DropdownMenuSeparator />
            <SignOutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
