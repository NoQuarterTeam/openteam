import { convexQuery, useConvexMutation } from "@convex-dev/react-query"
import { useQuery, useQueryClient, useMutation as useTanstackMutation } from "@tanstack/react-query"
import dayjs from "dayjs"
import { ChevronDownIcon, EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { redirect, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { FilePill } from "@/components/file-pill"
import { MessageInput } from "@/components/message-input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

export default function Component() {
  const [isEditing, setIsEditing] = useState(false)
  const { channelId } = useParams<{ channelId: Id<"channels"> }>()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: currentChannel } = useQuery(convexQuery(api.channels.get, { channelId: channelId! }))
  const { data: messages } = useQuery(convexQuery(api.messages.list, { channelId: channelId! }))

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const updateChannel = useTanstackMutation({
    mutationFn: useConvexMutation(api.channels.update),
    onSuccess: () => {
      setIsEditing(false)
    },
    onError: (e) => {
      console.error(e)
      toast.error("Failed to save channel")
    },
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const archiveChannel = useTanstackMutation({
    mutationFn: useConvexMutation(api.channels.update),
    onSuccess: () => {
      navigate("/")
      queryClient.invalidateQueries(convexQuery(api.channels.list, {}))
    },
    onError: (e) => {
      console.error(e)
      toast.error("Failed to archive channel")
    },
  })

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChannel) return

    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string | undefined
    if (!name?.trim()) return
    updateChannel.mutate({ channelId: currentChannel._id, name: name.toLowerCase() })
  }
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 250)
    }
  }, [isEditing])

  if (currentChannel === null) return redirect("/")

  return (
    <div className="flex flex-1 p-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b py-2 pr-2 pl-2">
          <p className={cn("pl-2 font-medium text-lg", isEditing && "hidden")}>
            # {currentChannel?.name.toLowerCase()} {currentChannel?.archivedTime && "(Archived)"}
          </p>
          <form onSubmit={handleSaveChannel} className={cn("flex items-center gap-2", isEditing ? "flex" : "hidden")}>
            <Input name="name" ref={inputRef} defaultValue={currentChannel?.name || ""} />
            <Button type="submit" className="w-20">
              {updateChannel.isPending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="outline" className="w-20" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </form>

          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!!currentChannel?.archivedTime}>
              <Button variant="ghost" size="icon">
                <EllipsisVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (!currentChannel) return
                  if (confirm("Are you sure you want to archive this channel?")) {
                    archiveChannel.mutate({ channelId: currentChannel._id, archivedTime: new Date().toISOString() })
                  }
                }}
              >
                <Trash2Icon />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2">
          {messages?.map((message, index) => {
            const isFirstMessageOfUser =
              index === 0 ||
              messages[index - 1]?.authorId !== message.authorId ||
              (messages[index - 1] &&
                new Date(message._creationTime).getTime() - new Date(messages[index - 1]._creationTime).getTime() >
                  10 * 60 * 1000)

            return (
              <div key={message._id} className="group flex gap-2 px-4 py-1.5 hover:bg-muted/50 dark:hover:bg-muted/10">
                <div className="pt-0">
                  {isFirstMessageOfUser && message.author ? (
                    <Avatar className="size-9 flex-shrink-0 rounded-lg">
                      <AvatarImage src={message.author.image || undefined} />
                      <AvatarFallback>{message.author.name.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-9 flex-shrink-0" />
                  )}
                </div>
                <div className="relative h-min flex-1">
                  {isFirstMessageOfUser ? (
                    <div className="flex items-center gap-2">
                      <span className="pb-1 font-semibold text-sm leading-3">{message.author?.name || "Unknown"}</span>
                      <span className="text-xs opacity-50">{dayjs(message._creationTime).format("HH:mm")}</span>
                    </div>
                  ) : (
                    <p className="-left-10 absolute top-0.5 hidden text-xs opacity-50 group-hover:block">
                      {dayjs(message._creationTime).format("HH:mm")}
                    </p>
                  )}
                  {message.content && (
                    <p className={cn("font-normal text-sm", message.temp && "opacity-70")}>{message.content}</p>
                  )}
                  {message.files && message.files.length > 0 && (
                    <div>
                      <WithState initialState={true}>
                        {(state, setState) => (
                          <>
                            <div className="flex items-center gap-0.5">
                              <p className="mb-1 text-xs opacity-50">
                                {message.files.length === 1 ? message.files[0].name : `${message.files.length} files`}
                              </p>
                              <Button variant="ghost" size="icon" className="size-4" onClick={() => setState(!state)}>
                                <ChevronDownIcon className="size-3.5 opacity-50" />
                              </Button>
                            </div>
                            {state && (
                              <div className="flex flex-wrap gap-2">
                                {message.files.length === 1 && <MessageFile file={message.files[0]} />}
                                {message.files.length > 1 &&
                                  message.files.map((file) => <MessageFile key={file._id} file={file} className="h-14 w-14" />)}
                              </div>
                            )}
                          </>
                        )}
                      </WithState>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
        {currentChannel && <MessageInput currentChannel={currentChannel} />}
      </div>
    </div>
  )
}

export function WithState<StateValue = undefined>({
  children,
  initialState,
}: {
  initialState?: StateValue | (() => StateValue)
  children: (
    state: StateValue | undefined,
    setState: React.Dispatch<React.SetStateAction<StateValue | undefined>>,
  ) => React.ReactNode
}) {
  const [state, setState] = useState<StateValue | undefined>(initialState)
  return children(state, setState)
}

type MessageFile = (typeof api.messages.list._returnType)[number]["files"][number]

function MessageFile({ file, className }: { file: MessageFile; className?: string }) {
  return (
    <a href={file.url || "#"} target="_blank" rel="noopener noreferrer" className={cn("inline-block max-w-md", className)}>
      {file.metadata?.contentType?.startsWith("image/") ? (
        <img src={file.url || "#"} alt={file.name} className="h-full w-full rounded-lg object-cover" />
      ) : (
        <FilePill name={file.name} />
      )}
    </a>
  )
}
