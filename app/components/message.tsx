import dayjs from "dayjs"
import { ChevronDownIcon } from "lucide-react"
import type { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"
import { FilePill } from "./file-pill"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { WithState } from "./with-state"

type MessageData = (typeof api.messages.list._returnType)[number]

interface Props {
  message: MessageData
  isFirstMessageOfUser: boolean
}

export function Message({ message, isFirstMessageOfUser }: Props) {
  return (
    <div key={message._id} className="group flex gap-2 px-4 py-1.5 hover:bg-muted/50 dark:hover:bg-muted/10">
      <div className="pt-0">
        {isFirstMessageOfUser && message.author ? (
          <Avatar className="size-9 flex-shrink-0 rounded-lg">
            <AvatarImage src={message.author.image || undefined} />
            <AvatarFallback className="size-9 rounded-lg text-black dark:text-white">
              {message.author.name.charAt(0) || "U"}
            </AvatarFallback>
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
        {message.content && <p className={cn("font-normal text-sm", message.temp && "opacity-70")}>{message.content}</p>}
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
}

type MessageFile = MessageData["files"][number]

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
