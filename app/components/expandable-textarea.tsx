import * as React from "react"
import { useImperativeHandle } from "react"
import { Textarea } from "./ui/textarea"

export type ExpandableTextareaRef = {
  resetHeight: () => void
  clearValue: () => void
  focus: () => void
} | null

export function ExpandableTextarea({
  ref,
  ...props
}: Omit<React.ComponentProps<typeof Textarea>, "ref"> & { ref?: React.RefObject<ExpandableTextareaRef> }) {
  const [input, setInput] = React.useState(props.defaultValue || "")

  const textAreaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    adjustHeight()

    setTimeout(() => {
      textAreaRef.current?.focus()
    }, 100)
  }, [])

  const adjustHeight = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto"
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight + 2}px`
    }
  }

  useImperativeHandle(ref, () => {
    return {
      focus: () => {
        if (textAreaRef.current) {
          textAreaRef.current.focus()
        }
      },
      resetHeight: () => {
        if (textAreaRef.current) {
          textAreaRef.current.style.height = "auto"
        }
      },
      clearValue: () => {
        setInput("")
      },
    }
  }, [])

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
    props.onChange?.(event)
    adjustHeight()
  }
  return (
    <Textarea ref={textAreaRef} rows={1} className="min-h-auto resize-none" {...props} onChange={handleInput} value={input} />
  )
}
