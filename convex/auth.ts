import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server"
import { query } from "./_generated/server"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password()],
  callbacks: {
    afterUserCreatedOrUpdated: async (ctx, args) => {
      await ctx.db.insert("channels", { name: "general", createdBy: args.userId })
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
