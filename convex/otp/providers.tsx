// hack to allow rendering emails in node on convex
if (typeof MessageChannel === "undefined") {
  class MockMessagePort {
    onmessage: ((ev: MessageEvent) => void) | undefined
    onmessageerror: ((ev: MessageEvent) => void) | undefined

    close() {}
    postMessage(_message: unknown, _transfer: Transferable[] = []) {}
    start() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent(_event: Event): boolean {
      return false
    }
  }

  class MockMessageChannel {
    port1: MockMessagePort
    port2: MockMessagePort

    constructor() {
      this.port1 = new MockMessagePort()
      this.port2 = new MockMessagePort()
    }
  }

  globalThis.MessageChannel = MockMessageChannel as unknown as typeof MessageChannel
}

import Resend from "@auth/core/providers/resend"
import { ConvexError } from "convex/values"
import { alphabet, generateRandomString } from "oslo/crypto"
import { ResetPasswordEmail } from "./ResetPasswordEmail"
import { VerificationCodeEmail } from "./VerificationCodeEmail"

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    return generateRandomString(8, alphabet("0-9"))
  },
  async sendVerificationRequest({ identifier: email, provider, token, expires }) {
    const { render } = await import("@react-email/render")
    const emailHtml = await render(<ResetPasswordEmail code={token} expires={expires} />)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        from: "OpenTeam <auth@updates.openteam.app>",
        to: [email],
        subject: `Reset your password`,
        text: "Your password reset code is " + token,
        html: emailHtml,
      }),
    }).catch(() => {
      throw new ConvexError("Could not send verification email")
    })
    if (!res.ok) {
      throw new ConvexError("Could not send verification email")
    }
  },
})

export const ResendOTPEmailVerification = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    return generateRandomString(8, alphabet("0-9"))
  },
  async sendVerificationRequest({ identifier: email, provider, token, expires }) {
    const { render } = await import("@react-email/render")
    const emailHtml = await render(<VerificationCodeEmail code={token} expires={expires} />)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        from: "OpenTeam <auth@updates.openteam.app>",
        to: [email],
        subject: "Please verify your email",
        html: emailHtml,
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
