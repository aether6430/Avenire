import * as React from "react";
import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailShell, emailColors } from "./email-shell";

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
    <EmailShell preview={`${sender} shared a file with you on Avenire`}>
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
        A file was shared with you
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
        {sender} shared <strong style={{ color: emailColors.ink }}>{fileName}</strong> with you.
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
          Open the file in Avenire to review the latest version and respond in context.
        </Text>
        <Button
          href={shareUrl}
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
          Open shared file
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
          {shareUrl}
        </Text>
      </div>

      <Hr style={{ borderColor: emailColors.border, margin: "26px 0" }} />
      <Text style={{ color: emailColors.muted, fontSize: 13, lineHeight: "20px", margin: 0, textAlign: "center" }}>
        Sign in to Avenire to open the file from the secure share link.
      </Text>
    </EmailShell>
  );
}

export default FileShareNotificationEmail;
