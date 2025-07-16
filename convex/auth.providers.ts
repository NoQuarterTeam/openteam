import Resend from "@auth/core/providers/resend"
import { ConvexError } from "convex/values"
import { alphabet, generateRandomString } from "oslo/crypto"

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    return generateRandomString(8, alphabet("0-9"))
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    // const resend = new ResendAPI(provider.apiKey)
    // const { error } = await resend.emails.send({
    //   from: "OpenTeam <auth@updates.openteam.app>",
    //   to: [email],
    //   subject: `Reset your password in My App`,
    //   text: "Your password reset code is " + token,
    // })

    // if (error) {
    //   throw new Error("Could not send")
    // }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        from: "OpenTeam <auth@updates.openteam.app>",
        to: [email],
        subject: `Reset your password in My App`,
        text: "Your password reset code is " + token,
      }),
    }).catch(() => {
      throw new ConvexError("Could not send verification email")
    })
    if (!res.ok) {
      throw new ConvexError("Could not send verification email")
    }
  },
})

export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    return generateRandomString(8, alphabet("0-9"))
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        from: "OpenTeam <auth@updates.openteam.app>",
        to: [email],
        subject: "Sign in to OpenTeam",
        text: "Your code is " + token,
      }),
    }).catch(() => {
      throw new ConvexError("Could not send verification email")
    })
    if (!res.ok) {
      throw new ConvexError("Could not send verification email")
    }
  },
})
