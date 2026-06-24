import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

type Props = {
  manageUrl: string;
};

export function ManageLink({ manageUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your subscription management link</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px", marginTop: 0 }}>Manage your subscriptions</Heading>
          <Text>
            You requested a link to manage your subscriptions to City Council
            Transcripts. Click the button below to view and update your
            preferences.
          </Text>
          <Button
            href={manageUrl}
            style={{
              backgroundColor: "#111827",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Manage subscriptions
          </Button>
          <Text style={{ fontSize: "12px", color: "#6b7280", marginTop: "24px" }}>
            Or paste this link into your browser: {manageUrl}
          </Text>
          <Text style={{ fontSize: "12px", color: "#6b7280" }}>
            If you didn&apos;t request this, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ManageLink;
