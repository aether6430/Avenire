import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface FileShareNotificationEmailProps {
  fileName: string;
  shareUrl: string;
  sharedByName?: string;
}

export function FileShareNotificationEmail({
  fileName,
  shareUrl,
  sharedByName,
}: FileShareNotificationEmailProps) {
  const sender = sharedByName?.trim() || "A teammate";

  return (
    <Html>
      <Head />
      <Preview>{sender} shared a file with you on Avenire</Preview>
      <Body style={{ backgroundColor: "#f6f7fb", fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px" }}>
          <Section>
            <Heading as="h1" style={{ marginTop: "0", marginBottom: "12px" }}>
              A file was shared with you
            </Heading>
            <Text style={{ margin: "0 0 12px 0" }}>
              {sender} shared <strong>{fileName}</strong> with you.
            </Text>
            <Text style={{ margin: "0 0 20px 0" }}>
              Sign in to Avenire to open the file from the secure share link below.
            </Text>
            <Button
              href={shareUrl}
              style={{
                backgroundColor: "#111827",
                borderRadius: "8px",
                color: "#ffffff",
                display: "inline-block",
                fontWeight: "bold",
                padding: "12px 18px",
                textDecoration: "none",
              }}
            >
              Open shared file
            </Button>
            <Text style={{ color: "#6b7280", fontSize: "12px", marginTop: "20px" }}>
              If the button does not work, copy and paste this URL into your browser:
              <br />
              {shareUrl}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default FileShareNotificationEmail;
