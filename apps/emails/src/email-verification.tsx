import * as React from "react";
import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components";
import { EmailShell, emailColors } from "./email-shell";

export const EmailConfirmation = ({
  name = "there",
  confirmationLink = "/confirm-email",
}: {
  name?: string;
  confirmationLink?: string;
}) => {
  return (
    <EmailShell preview="Confirm your email address for Avenire">
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
        Welcome, {name}
      </Heading>

      <Text
        style={{
          color: emailColors.muted,
          fontSize: 17,
          lineHeight: "28px",
          margin: "0 auto 24px",
          maxWidth: 500,
          textAlign: "center",
        }}
      >
        Confirm your email to finish setting up your Avenire account and unlock the workspace.
      </Text>

      <Section
        style={{
          backgroundColor: emailColors.cardAlt,
          border: `1px solid ${emailColors.border}`,
          borderRadius: 22,
          margin: "0 auto 24px",
          maxWidth: 500,
          padding: 24,
        }}
      >
        <Text
          style={{
            color: emailColors.ink,
            fontSize: 15,
            lineHeight: "24px",
            margin: "0 0 18px",
            textAlign: "center",
          }}
        >
          To complete authentication, confirm this address by opening the button below.
        </Text>

        <Section style={{ textAlign: "center" }}>
          <Button
            href={confirmationLink}
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
            Confirm email
          </Button>
        </Section>
      </Section>

      <Text
        style={{
          color: emailColors.muted,
          fontSize: 13,
          lineHeight: "20px",
          margin: "0 0 16px",
          textAlign: "center",
        }}
      >
        This link expires in 24 hours. If you did not create an account, you can ignore this email.
      </Text>

      <Hr style={{ borderColor: emailColors.border, margin: "26px 0" }} />

      <Text
        style={{
          color: emailColors.muted,
          fontSize: 13,
          lineHeight: "20px",
          margin: 0,
          textAlign: "center",
        }}
      >
        If the button does not work, copy and paste this link:
      </Text>
      <Text
        style={{
          color: emailColors.accentStrong,
          fontSize: 13,
          lineHeight: "20px",
          margin: "8px 0 0",
          textAlign: "center",
          wordBreak: "break-word",
        }}
      >
        <Link href={confirmationLink} style={{ color: emailColors.accent, textDecoration: "underline" }}>
          {confirmationLink}
        </Link>
      </Text>
    </EmailShell>
  );
};

EmailConfirmation.PreviewProps = {
  name: "Alex",
  confirmationLink: "/confirm-email?token=example123",
};

export default EmailConfirmation;
