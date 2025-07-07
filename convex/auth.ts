import GitHub from "@auth/core/providers/github"
import { Anonymous } from "@convex-dev/auth/providers/Anonymous"
import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import { z } from "zod"
import type { DataModel, Id } from "./_generated/dataModel"
import { type MutationCtx, type QueryCtx, query } from "./_generated/server"

const ParamsSchema = z.object({ email: z.string().email(), name: z.string() })

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
        return data
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx: MutationCtx, args) {
      if (!args.existingUserId) {
        const user = await ctx.db.get(args.userId)
        if (!user) throw new ConvexError("User not found")

        let teamId: Id<"teams"> | null = null
        if (user.isAnonymous) {
          const team = await ctx.db.query("teams").first()
          teamId = team!._id
        } else {
          teamId = await ctx.db.insert("teams", { name: `${user.name}'s Team`, createdBy: args.userId })
        }
        await ctx.db.patch(args.userId, { teamId })

        const existingChannels = await ctx.db
          .query("channels")
          .withIndex("by_team", (q) => q.eq("teamId", teamId))
          .first()
        if (!existingChannels) {
          await ctx.db.insert("channels", { name: "general", createdBy: args.userId, teamId })
        }
        await ctx.db.insert("channels", {
          name: args.userId,
          createdBy: args.userId,
          userId: args.userId,
          teamId,
        })
      }
    },
  },
})

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const user = await ctx.db.get(userId)
    if (!user) return null

    return { ...user, image: user.image ? await ctx.storage.getUrl(user.image) : null }
  },
})

export const requireUser = async (ctx: MutationCtx | QueryCtx) => {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new ConvexError("Not authenticated")
  const user = await ctx.db.get(userId)
  if (!user) throw new ConvexError("User not found")
  return user
}

export const canManageTeamChannel = async (ctx: MutationCtx | QueryCtx, channelId: Id<"channels">) => {
  const user = await requireUser(ctx)
  if (!user.teamId) throw new ConvexError("User is not part of a team")
  const channel = await ctx.db.get(channelId)
  if (!channel) throw new ConvexError("Channel not found")
  if (channel.teamId !== user.teamId) throw new ConvexError("User does not have access to this channel")
  return user
}
