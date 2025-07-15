import GitHub from "@auth/core/providers/github"
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"
import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"
import type { GenericMutationCtx } from "convex/server"
import { ConvexError } from "convex/values"
import { z } from "zod"
import type { DataModel, Id } from "./_generated/dataModel"
import { type MutationCtx, type QueryCtx, query } from "./_generated/server"

const ParamsSchema = z.object({ email: z.string().email(), name: z.string().min(1), teamId: z.string().min(1) })

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous<DataModel>({
      profile() {
        const id = Math.random().toString(36).substring(2, 8)
        return {
          isAnonymous: true,
          name: id,
          email: `${id}@noquarter.co`,
        }
      },
    }),
    GitHub({
      async profile(githubProfile) {
        const allowedDomain = process.env.ALLOWED_DOMAIN
        if (!githubProfile.email) throw new ConvexError("Email is required")
        if (allowedDomain && !githubProfile.email.endsWith(`@${allowedDomain}`)) {
          throw new ConvexError("This email domain is not allowed")
        }

        return {
          id: githubProfile.id.toString(),
          name: githubProfile.name,
          email: githubProfile.email,
          // githubImage: githubProfile.avatar_url,
        }
      },
    }),
    Password<DataModel>({
      profile(params) {
        const { error, data } = ParamsSchema.safeParse(params)
        if (error) throw new ConvexError({ fieldErrors: error.flatten().fieldErrors })
        const allowedDomain = process.env.ALLOWED_DOMAIN
        if (allowedDomain && !data.email.endsWith(`@${allowedDomain}`)) {
          throw new ConvexError("This email domain is not allowed")
        }
        return { ...data, teamId: data.teamId as Id<"teams"> }
      },
    }),
  ],
  callbacks: {
    createOrUpdateUser: async (ctx: GenericMutationCtx<DataModel>, args) => {
      if (args.existingUserId) return args.existingUserId

      const existingUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.profile.email as string))
        .first()
      if (existingUser) return existingUser._id

      const userId = await ctx.db.insert("users", {
        name: args.profile.name as string,
        email: args.profile.email as string,
        image: args.profile.image as Id<"_storage">,
      })

      const user = await ctx.db.get(userId)
      if (!user) throw new ConvexError("User not found")

      let teamId = args.profile.teamId as Id<"teams"> | undefined

      if (!teamId) {
        if (!args.profile.isAnonymous) {
          teamId = await ctx.db.insert("teams", { name: user.name, createdBy: user._id })
          await ctx.db.insert("channels", { name: "general", createdBy: user._id, teamId })
        } else {
          const demoTeam = await ctx.db
            .query("teams")
            .filter((q) => q.eq(q.field("isDemo"), true))
            .first()
          teamId = demoTeam?._id!
        }
      }
      await ctx.db.insert("channels", { name: user._id, createdBy: user._id, userId: user._id, teamId })
      await ctx.db.insert("userTeams", {
        userId: user._id,
        teamId,
        role: args.profile.teamId || args.profile.isAnonymous ? "member" : "admin",
      })
      return userId
    },

    // async afterUserCreatedOrUpdated(ctx: MutationCtx, args) {
    //   if (!args.existingUserId) {
    //     const user = await ctx.db.get(args.userId)
    //     if (!user) throw new ConvexError("User not found")

    //     const teamId = await ctx.db.insert("teams", { name: user.name, createdBy: args.userId })
    //     await ctx.db.insert("userTeams", { userId: args.userId, teamId, role: "admin" })
    //     await ctx.db.insert("channels", { name: "general", createdBy: args.userId, teamId })
    //     await ctx.db.insert("channels", { name: args.userId, createdBy: args.userId, userId: args.userId, teamId })
    //   }
    // },
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

export const canManageTeam = async (ctx: MutationCtx | QueryCtx, teamId: Id<"teams">) => {
  const user = await requireUser(ctx)
  const team = await ctx.db.get(teamId)
  if (!team) throw new ConvexError("Team not found")
  const userTeam = await ctx.db
    .query("userTeams")
    .withIndex("by_user_team", (q) => q.eq("userId", user._id).eq("teamId", teamId))
    .first()

  if (!userTeam) throw new ConvexError("User does not have access to this team")
  return { user, team, userTeam }
}

export const canManageTeamChannel = async (ctx: MutationCtx | QueryCtx, channelId: Id<"channels">) => {
  const user = await requireUser(ctx)
  const channel = await ctx.db.get(channelId)
  if (!channel) throw new ConvexError("Channel not found")
  const userTeams = await ctx.db
    .query("userTeams")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect()

  if (!userTeams.find((userTeam) => userTeam.teamId === channel.teamId))
    throw new ConvexError("User does not have access to this channel")
  return user
}

export const canManageTeamMessage = async (ctx: MutationCtx | QueryCtx, messageId: Id<"messages">) => {
  const user = await requireUser(ctx)
  const message = await ctx.db.get(messageId)
  if (!message) throw new ConvexError("Message not found")
  const channel = await ctx.db.get(message.channelId)
  if (!channel) throw new ConvexError("Channel not found")
  const userTeams = await ctx.db
    .query("userTeams")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect()

  if (!userTeams.find((userTeam) => userTeam.teamId === channel.teamId))
    throw new ConvexError("User does not have access to this channel")
  return user
}
