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
  confirmUrl: string;
  description: string;
};

export function ConfirmSubscription({ confirmUrl, description }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your subscription to City Council Transcripts</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px", marginTop: 0 }}>Confirm your subscription</Heading>
          <Text>You requested: {description}</Text>
          <Text>Click the button below to confirm. If you didn&apos;t request this, you can ignore this email.</Text>
          <Button
            href={confirmUrl}
            style={{
              backgroundColor: "#111827",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Confirm subscription
          </Button>
          <Text style={{ fontSize: "12px", color: "#6b7280", marginTop: "24px" }}>
            Or paste this link into your browser: {confirmUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ConfirmSubscription;
