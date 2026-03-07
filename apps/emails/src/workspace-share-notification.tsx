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

export interface WorkspaceShareNotificationEmailProps {
  workspaceName: string;
  workspaceUrl: string;
  sharedByName?: string;
}

export function WorkspaceShareNotificationEmail({
  workspaceName,
  workspaceUrl,
  sharedByName,
}: WorkspaceShareNotificationEmailProps) {
  const sender = sharedByName?.trim() || "A teammate";

  return (
    <Html>
      <Head />
      <Preview>{sender} shared a workspace with you on Avenire</Preview>
      <Body style={{ backgroundColor: "#f6f7fb", fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "24px" }}>
          <Section>
            <Heading as="h1" style={{ marginTop: "0", marginBottom: "12px" }}>
              Workspace shared with you
            </Heading>
            <Text style={{ margin: "0 0 12px 0" }}>
              {sender} gave you access to <strong>{workspaceName}</strong>.
            </Text>
            <Text style={{ margin: "0 0 20px 0" }}>
              Open the workspace to view and collaborate on files.
            </Text>
            <Button
              href={workspaceUrl}
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
              Open workspace
            </Button>
            <Text style={{ color: "#6b7280", fontSize: "12px", marginTop: "20px" }}>
              If the button does not work, copy and paste this URL into your browser:
              <br />
              {workspaceUrl}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WorkspaceShareNotificationEmail;
