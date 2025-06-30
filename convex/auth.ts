import GitHub from "@auth/core/providers/github"
import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import { z } from "zod"
import { type MutationCtx, type QueryCtx, query } from "./_generated/server"

const ParamsSchema = z.object({ email: z.string().email(), name: z.string().optional() })

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
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
    Password({
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
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        return args.existingUserId
      }

      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), args.profile.email))
        .first()

      if (existingUser) {
        return existingUser._id
      }

      return await ctx.db.insert("users", {
        name: args.profile.name as string,
        email: args.profile.email as string,
      })
    },
    afterUserCreatedOrUpdated: async (ctx: MutationCtx, args) => {
      const existingChannels = await ctx.db.query("channels").first()
      if (!existingChannels) {
        await ctx.db.insert("channels", { name: "general", createdBy: args.userId })
      }
      await ctx.db.insert("channels", { name: args.userId, createdBy: args.userId, userId: args.userId })
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
  return userId
}
