import * as React from "react";

export function InviteEmail({
  teamName,
  inviteLink,
}: {
  teamName: string;
  inviteLink: string;
}) {
  return (
    <div style={{ fontFamily: "sans-serif", color: "#222" }}>
      <h1>You've been invited to join {teamName} on OpenTeam!</h1>
      <p>Click the link below to accept your invite:</p>
      <a href={inviteLink} style={{ color: "#2563eb", fontWeight: "bold" }}>
        {inviteLink}
      </a>
      <p>If you did not expect this, you can ignore this email.</p>
    </div>
  );
}
