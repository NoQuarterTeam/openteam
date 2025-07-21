import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval("clear userChannelTyping table", { minutes: 60 }, internal.userChannelTyping.cleanupOldTypingIndicators)

export default crons
