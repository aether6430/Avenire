import * as React from "react";
import { Heading, Hr, Text } from "@react-email/components";
import { EmailShell, emailColors } from "./email-shell";

export interface SecurityVerificationCodeEmailProps {
  code: string;
  expiresInMinutes: number;
}

export function SecurityVerificationCodeEmail({
  code,
  expiresInMinutes,
}: SecurityVerificationCodeEmailProps) {
  return (
    <EmailShell preview="Your Avenire security verification code">
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
        Verify your action
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
        Use the code below to confirm a sensitive Avenire settings action.
      </Text>

      <div
        style={{
          backgroundColor: emailColors.cardAlt,
          border: `1px solid ${emailColors.border}`,
          borderRadius: 22,
          marginBottom: 24,
          padding: 24,
          textAlign: "center",
        }}
      >
        <Text
          style={{
            color: emailColors.accentStrong,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: "0.3em",
            lineHeight: "48px",
            margin: "0 auto",
            padding: "12px 0",
          }}
        >
          {code}
        </Text>
      </div>

      <div
        style={{
          backgroundColor: "#f1f6f2",
          border: `1px solid ${emailColors.border}`,
          borderRadius: 20,
          marginBottom: 24,
          padding: 20,
        }}
      >
        <Text style={{ color: emailColors.ink, fontSize: 15, lineHeight: "24px", margin: 0 }}>
          This code expires in {expiresInMinutes} minutes and can only be used once.
        </Text>
      </div>

      <Hr style={{ borderColor: emailColors.border, margin: "26px 0" }} />
      <Text style={{ color: emailColors.muted, fontSize: 13, lineHeight: "20px", margin: 0, textAlign: "center" }}>
        If you did not request this code, you can safely ignore this email.
      </Text>
    </EmailShell>
  );
}

export default SecurityVerificationCodeEmail;
