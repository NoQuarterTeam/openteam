import DOMPurify from "dompurify"
import hljs from "highlight.js"
import { Marked } from "marked"
import { markedHighlight } from "marked-highlight"

export const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext"
      return hljs.highlight(code, { language }).value
    },
  }),
)

export function renderMessageContent(content: string) {
  const rawHtml = marked.parse(content, { async: false, breaks: true, gfm: true })
  const cleanHtml = DOMPurify.sanitize(rawHtml)
  return cleanHtml
}
