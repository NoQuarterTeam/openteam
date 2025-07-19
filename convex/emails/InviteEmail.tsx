import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components"

export const InviteEmail = ({ teamName, inviteLink }: { teamName: string; inviteLink: string }) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>You've been invited to join {teamName} on OpenTeam!</Preview>
      <Container style={container}>
        <Section style={logoContainer}>
          <Heading style={h1}>OpenTeam</Heading>
        </Section>
        <Text style={heroText}>
          You've been invited to join {teamName} on OpenTeam! Click the link below to accept your invite:
        </Text>

        <Section style={buttonContainer}>
          <Button href={inviteLink} style={button}>
            View Invite
          </Button>
        </Section>

        <Text style={text}>If you did not expect this, you can ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: "0 auto",
  padding: "0px 16px",
}

const logoContainer = {
  marginTop: "16px",
}

const h1 = {
  color: "#1d1c1d",
  fontSize: "36px",
  fontWeight: "700",
  margin: "20px 0",
  padding: "0",
  lineHeight: "42px",
}

const heroText = {
  fontSize: "20px",
  lineHeight: "28px",
  marginBottom: "30px",
}

const buttonContainer = {
  marginBottom: "30px",
}

const button = {
  backgroundColor: "#000",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  padding: "10px 20px",
}

const text = {
  color: "#000",
  fontSize: "14px",
  lineHeight: "24px",
}
