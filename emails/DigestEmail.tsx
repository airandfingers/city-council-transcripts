import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export type DigestItem = {
  title: string;
  summary: string | null;
  url: string;
};

export type DigestGroup = {
  /** e.g. "Monterey Park" for a city group, or "Bike Lanes · Monterey Park" for a topic group. */
  heading: string;
  items: DigestItem[];
};

type Props = {
  /** e.g. "Daily", "Weekly", "Monthly" — used in the subject/preview line. */
  frequencyLabel: string;
  groups: DigestGroup[];
  manageUrl?: string;
};

export function DigestEmail({ frequencyLabel, groups, manageUrl }: Props) {
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Html>
      <Head />
      <Preview>
        {`Your ${frequencyLabel.toLowerCase()} Counciloris digest: ${itemCount} update${itemCount === 1 ? "" : "s"}`}
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
            {frequencyLabel} digest
          </Text>
          <Heading style={{ fontSize: "20px", marginTop: 0 }}>
            {itemCount} update{itemCount === 1 ? "" : "s"} for you
          </Heading>

          {groups.map((group, i) => (
            <div key={i}>
              <Hr style={{ borderColor: "#e5e7eb", marginTop: "20px" }} />
              <Heading as="h2" style={{ fontSize: "15px", marginBottom: "8px" }}>
                {group.heading}
              </Heading>
              {group.items.map((item, j) => (
                <div key={j} style={{ marginBottom: "16px" }}>
                  <Text style={{ fontWeight: "600", marginBottom: "2px" }}>
                    <a href={item.url} style={{ color: "#111827", textDecoration: "none" }}>
                      {item.title}
                    </a>
                  </Text>
                  {item.summary && (
                    <Text style={{ marginTop: 0, marginBottom: "4px", color: "#374151" }}>
                      {item.summary}
                    </Text>
                  )}
                  <Text style={{ fontSize: "12px", color: "#6b7280", marginTop: 0 }}>
                    {item.url}
                  </Text>
                </div>
              ))}
            </div>
          ))}

          {manageUrl && (
            <>
              <Hr style={{ borderColor: "#e5e7eb", marginTop: "8px" }} />
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

export default DigestEmail;
