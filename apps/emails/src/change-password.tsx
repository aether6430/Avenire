import * as React from "react";
import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import { EmailShell, emailColors } from "./email-shell";

export const PasswordReset = ({
  name = "there",
  resetLink = "/reset-password",
}: {
  name?: string;
  resetLink?: string;
}) => {
  return (
    <EmailShell preview="Reset your Avenire password">
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
        Reset your password
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
        We received a request to reset the password for {name}. Use the secure link below to continue.
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
          For your security, the link expires in 1 hour. If you didn’t request this, you can ignore the message.
        </Text>
        <Button
          href={resetLink}
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
          Reset password
        </Button>
      </div>

      <div
        style={{
          backgroundColor: "#f1f6f2",
          border: `1px solid ${emailColors.border}`,
          borderLeft: `4px solid ${emailColors.accent}`,
          borderRadius: 20,
          marginBottom: 24,
          padding: 20,
        }}
      >
        <Text style={{ color: emailColors.ink, fontSize: 15, lineHeight: "24px", margin: 0 }}>
          If the button does not work, paste this link into your browser:
        </Text>
        <Text style={{ color: emailColors.accentStrong, fontSize: 13, lineHeight: "20px", margin: "8px 0 0", wordBreak: "break-word" }}>
          <Link href={resetLink} style={{ color: emailColors.accent, textDecoration: "underline" }}>
            {resetLink}
          </Link>
        </Text>
      </div>

      <Hr style={{ borderColor: emailColors.border, margin: "26px 0" }} />

      <Text style={{ color: emailColors.muted, fontSize: 13, lineHeight: "20px", margin: 0, textAlign: "center" }}>
        Need help? Reply here and we’ll take care of it.
      </Text>
    </EmailShell>
  );
};

PasswordReset.PreviewProps = {
  name: "Alex",
  resetLink:
    "/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
};

export default PasswordReset;
