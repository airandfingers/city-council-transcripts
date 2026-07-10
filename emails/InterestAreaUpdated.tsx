import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

type Props = {
  areaName: string;
  cityName: string;
  tldr: string | null;
  highlights: string[];
  areaUrl: string;
  manageUrl?: string;
};

export function InterestAreaUpdated({
  areaName,
  cityName,
  tldr,
  highlights,
  areaUrl,
  manageUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        Update on {areaName} from {cityName} city council
      </Preview>
      <Body
        style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "8px",
            maxWidth: "560px",
          }}
        >
          <Text style={{ color: "#6b7280", marginTop: 0, marginBottom: "4px", fontSize: "13px" }}>
            Topic update · {cityName}
          </Text>
          <Heading style={{ fontSize: "20px", marginTop: 0 }}>{areaName}</Heading>

          <Heading as="h2" style={{ fontSize: "16px", marginBottom: "4px" }}>
            What happened
          </Heading>
          {tldr ? (
            <Text style={{ marginTop: 0 }}>{tldr}</Text>
          ) : (
            <Text style={{ marginTop: 0, color: "#6b7280" }}>
              This topic was discussed at a recent meeting.
            </Text>
          )}

          {highlights.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: "16px", marginBottom: "4px" }}>
                Highlights
              </Heading>
              <ul style={{ marginTop: 0, paddingLeft: "20px" }}>
                {highlights.map((h, i) => (
                  <li key={i} style={{ marginBottom: "6px", lineHeight: "1.5" }}>
                    {h}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Button
            href={areaUrl}
            style={{
              backgroundColor: "#111827",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
              marginTop: "8px",
            }}
          >
            View on Counciloris
          </Button>
          <Text style={{ fontSize: "12px", color: "#6b7280", marginTop: "24px" }}>
            Or paste this link into your browser: {areaUrl}
          </Text>

          {manageUrl && (
            <>
              <Hr style={{ borderColor: "#e5e7eb", marginTop: "24px" }} />
              <Text style={{ fontSize: "12px", color: "#6b7280" }}>
                Manage your subscriptions or unsubscribe:{" "}
                <a href={manageUrl} style={{ color: "#6b7280" }}>
                  {manageUrl}
                </a>
              </Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}

export default InterestAreaUpdated;
