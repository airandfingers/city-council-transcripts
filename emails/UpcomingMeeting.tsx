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
  meetingTitle: string;
  cityName: string;
  meetingDate: Date;
  /** One-line teaser. */
  bite: string;
  /** Short paragraph. */
  snack: string;
  /** Fuller narrative. */
  meal: string;
  meetingUrl: string;
  manageUrl?: string;
  /**
   * False when no agenda has been posted yet — bite/snack/meal are all
   * placeholder copy restating the same "nothing to report yet" message.
   * In that case the "Full picture" section is skipped so the email isn't
   * three tiers saying the same thing. Defaults to true (today's behavior).
   */
  agendaAvailable?: boolean;
};

export function UpcomingMeeting({
  meetingTitle,
  cityName,
  meetingDate,
  bite,
  snack,
  meal,
  meetingUrl,
  manageUrl,
  agendaAvailable = true,
}: Props) {
  const dateStr = meetingDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Html>
      <Head />
      <Preview>
        Upcoming {cityName} city council: {bite}
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
            Upcoming meeting · {cityName}
          </Text>
          <Heading style={{ fontSize: "20px", marginTop: 0 }}>{meetingTitle}</Heading>
          <Text style={{ color: "#6b7280", marginTop: "-12px" }}>{dateStr}</Text>

          {/* Bite — one-liner */}
          <Text
            style={{
              fontWeight: "600",
              fontSize: "16px",
              borderLeft: "3px solid #111827",
              paddingLeft: "12px",
              marginLeft: 0,
            }}
          >
            {bite}
          </Text>

          {/* Snack — short paragraph */}
          <Heading as="h2" style={{ fontSize: "15px", marginBottom: "4px" }}>
            Quick take
          </Heading>
          <Text style={{ marginTop: 0 }}>{snack}</Text>

          {/* Meal — full picture. Skipped when there's no agenda yet, since
              bite/snack/meal are all the same "nothing to report" placeholder. */}
          {agendaAvailable && (
            <>
              <Heading as="h2" style={{ fontSize: "15px", marginBottom: "4px" }}>
                Full picture
              </Heading>
              <Text style={{ marginTop: 0 }}>{meal}</Text>
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

export default UpcomingMeeting;
