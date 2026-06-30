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
  /** Meeting title, e.g. "City Council Regular Meeting". */
  meetingTitle: string;
  /** City the meeting belongs to, e.g. "Palo Alto". */
  cityName: string;
  /** One-paragraph TL;DR (the meeting logline). */
  tldr: string | null;
  /** Bulleted key decisions from the meeting. */
  keyDecisions: string[];
  /** Link to the meeting page on Counciloris. */
  meetingUrl: string;
  /** Link to manage/unsubscribe; omitted for admin notifications. */
  manageUrl?: string;
};

export function MeetingPublished({
  meetingTitle,
  cityName,
  tldr,
  keyDecisions,
  meetingUrl,
  manageUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>
        New on Counciloris: {meetingTitle} ({cityName})
      </Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f6f6f6", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px", marginTop: 0 }}>{meetingTitle}</Heading>
          <Text style={{ color: "#6b7280", marginTop: 0 }}>{cityName}</Text>

          <Heading as="h2" style={{ fontSize: "16px", marginBottom: "4px" }}>
            TL;DR
          </Heading>
          {tldr ? (
            <Text style={{ marginTop: 0 }}>{tldr}</Text>
          ) : (
            <Text style={{ marginTop: 0, color: "#6b7280" }}>
              No summary available for this meeting yet.
            </Text>
          )}

          {keyDecisions.length > 0 && (
            <>
              <Heading as="h2" style={{ fontSize: "16px", marginBottom: "4px" }}>
                Key Decisions
              </Heading>
              <ul style={{ marginTop: 0, paddingLeft: "20px" }}>
                {keyDecisions.map((decision, i) => (
                  <li key={i} style={{ marginBottom: "6px", lineHeight: "1.5" }}>
                    {decision}
                  </li>
                ))}
              </ul>
            </>
          )}

          <Button
            href={meetingUrl}
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
            Or paste this link into your browser: {meetingUrl}
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

export default MeetingPublished;
