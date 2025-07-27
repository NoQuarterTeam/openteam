import Apple from "@auth/core/providers/apple"
import GitHub from "@auth/core/providers/github"
import Google from "@auth/core/providers/google"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"
import type { GenericMutationCtx } from "convex/server"
import { ConvexError } from "convex/values"
import type { DataModel } from "./_generated/dataModel"
import { type MutationCtx, type QueryCtx, query } from "./_generated/server"

// const ParamsSchema = z.object({
//   email: z.string().email().min(5, "Email is required").trim().toLowerCase(),
//   name: z.string().min(2, "Name is required").trim().optional().default("Unknown"),
//   password: z.string().min(8, "Password must be at least 8 characters long").optional(),
// })

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Anonymous<DataModel>({
    //   profile() {
    //     const id = Math.random().toString(36).substring(2, 8)
    //     return { isAnonymous: true, name: id, email: `${id}@noquarter.co` }
    //   },
    // }),
    Apple({
      profile: (appleInfo) => {
        const name = appleInfo.user ? `${appleInfo.user.name.firstName} ${appleInfo.user.name.lastName}` : "User"
        return {
          id: appleInfo.sub?.toString(),
          name,
          email: appleInfo.email,
        }
      },
    }),
    GitHub({
      async profile(githubProfile) {
        if (!githubProfile.email) throw new ConvexError("Email is required")
        return {
          id: githubProfile.id.toString(),
          name: githubProfile.name,
          email: githubProfile.email,
          // githubImage: githubProfile.avatar_url,
        }
      },
    }),
    Google({
      async profile(googleProfile) {
        if (!googleProfile.email) throw new ConvexError("Email is required")
        return {
          id: googleProfile.sub,
          name: googleProfile.name,
          email: googleProfile.email,
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      if (redirectTo.startsWith("openteam://")) return redirectTo
      return process.env.SITE_URL!
    },
    createOrUpdateUser: async (ctx: GenericMutationCtx<DataModel>, args) => {
      if (args.existingUserId) return args.existingUserId

      const existingUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.profile.email as string))
        .first()

      if (existingUser) return existingUser._id

      const userId = await ctx.db.insert("users", { name: args.profile.name as string, email: args.profile.email as string })

      return userId
    },
  },
})

export const me = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const user = await ctx.db.get(userId)
    if (!user) return null

    const userTeams = await ctx.db
      .query("userTeams")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()

    return { ...user, image: user.image ? await ctx.storage.getUrl(user.image) : null, userTeams }
  },
})

export const requireUser = async (ctx: MutationCtx | QueryCtx) => {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new ConvexError("Not authenticated")
  const user = await ctx.db.get(userId)
  if (!user) throw new ConvexError("User not found")
  return user
}

export const canManageTeam = async (ctx: MutationCtx | QueryCtx, teamId: string) => {
  const user = await requireUser(ctx)
  const normalizedTeamId = ctx.db.normalizeId("teams", teamId)
  if (!normalizedTeamId) throw new ConvexError("Invalid team ID")
  const team = await ctx.db.get(normalizedTeamId)
  if (!team) throw new ConvexError("Team not found")
  const userTeam = await ctx.db
    .query("userTeams")
    .withIndex("by_user_team", (q) => q.eq("userId", user._id).eq("teamId", normalizedTeamId))
    .first()

  if (!userTeam) throw new ConvexError("User does not have access to this team")
  return { user, team, userTeam }
}

export const canManageTeamChannel = async (ctx: MutationCtx | QueryCtx, channelId: string) => {
  const normalizedChannelId = ctx.db.normalizeId("channels", channelId)
  if (!normalizedChannelId) throw new ConvexError("Invalid channel ID")
  const channel = await ctx.db.get(normalizedChannelId)
  if (!channel) throw new ConvexError("Channel not found")

  const { user, team } = await canManageTeam(ctx, channel.teamId)
  return { user, channel, team }
}

export const canManageTeamMessage = async (ctx: MutationCtx | QueryCtx, messageId: string) => {
  const normalizedMessageId = ctx.db.normalizeId("messages", messageId)
  if (!normalizedMessageId) throw new ConvexError("Invalid message ID")
  const message = await ctx.db.get(normalizedMessageId)
  if (!message) throw new ConvexError("Message not found")
  const { user, channel, team } = await canManageTeamChannel(ctx, message.channelId)
  return { user, team, channel, message }
}
