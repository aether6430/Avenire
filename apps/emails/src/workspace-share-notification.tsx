import * as React from "react";
import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailShell, emailColors } from "./email-shell";

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
    <EmailShell preview={`${sender} shared a workspace with you on Avenire`}>
      <Heading
        style={{
          color: emailColors.ink,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: "40px",
          margin: "0 0 12px",
          textAlign: "center",
        }}
      >
        Workspace access granted
      </Heading>

      <Text
        style={{
          color: emailColors.muted,
          fontSize: 17,
          lineHeight: "28px",
          margin: "0 auto 24px",
          maxWidth: 520,
          textAlign: "center",
        }}
      >
        {sender} gave you access to <strong style={{ color: emailColors.ink }}>{workspaceName}</strong>.
      </Text>

      <div
        style={{
          backgroundColor: emailColors.cardAlt,
          border: `1px solid ${emailColors.border}`,
          borderRadius: 22,
          marginBottom: 24,
          padding: 24,
        }}
      >
        <Text style={{ color: emailColors.ink, fontSize: 15, lineHeight: "24px", margin: "0 0 18px" }}>
          Open the workspace to view files, respond to comments, and collaborate with your team.
        </Text>
        <Button
          href={workspaceUrl}
          style={{
            backgroundColor: emailColors.accent,
            borderRadius: 14,
            color: "#ffffff",
            display: "inline-block",
            fontSize: 15,
            fontWeight: 700,
            padding: "14px 22px",
            textDecoration: "none",
          }}
        >
          Open workspace
        </Button>
      </div>

      <div
        style={{
          backgroundColor: "#f1f6f2",
          border: `1px solid ${emailColors.border}`,
          borderRadius: 20,
          padding: 20,
        }}
      >
        <Text style={{ color: emailColors.muted, fontSize: 13, lineHeight: "20px", margin: 0 }}>
          If the button does not work, copy and paste this URL:
        </Text>
        <Text style={{ color: emailColors.accentStrong, fontSize: 13, lineHeight: "20px", margin: "8px 0 0", wordBreak: "break-word" }}>
          {workspaceUrl}
        </Text>
      </div>

      <Hr style={{ borderColor: emailColors.border, margin: "26px 0" }} />
      <Text style={{ color: emailColors.muted, fontSize: 13, lineHeight: "20px", margin: 0, textAlign: "center" }}>
        Use Avenire to stay organized across files and shared workspaces.
      </Text>
    </EmailShell>
  );
}

export default WorkspaceShareNotificationEmail;
