import * as React from "react";
import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import { EmailShell, emailColors } from "./email-shell";

export const DeleteAccountConfirmation = ({
  name = "there",
  confirmationLink = "/confirm-deletion",
}: {
  name?: string;
  confirmationLink?: string;
}) => {
  return (
    <EmailShell preview="Confirm your Avenire account deletion request">
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
        Confirm account deletion
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
        Hey {name}, we received a request to delete your Avenire account.
      </Text>

      <div
        style={{
          backgroundColor: "#fff4ef",
          border: "1px solid #f0d2c0",
          borderLeft: "4px solid #c15d2f",
          borderRadius: 20,
          marginBottom: 24,
          padding: 20,
        }}
      >
        <Text style={{ color: "#7c3413", fontSize: 15, lineHeight: "24px", margin: 0 }}>
          This is a destructive action. Confirm only if you want your account and associated access removed.
        </Text>
      </div>

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
          If you didn’t request this, simply ignore the email and your account will stay active.
        </Text>
        <Button
          href={confirmationLink}
          style={{
            backgroundColor: "#b94a22",
            borderRadius: 14,
            color: "#ffffff",
            display: "inline-block",
            fontSize: 15,
            fontWeight: 700,
            padding: "14px 22px",
            textDecoration: "none",
          }}
        >
          Confirm deletion
        </Button>
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
          You can also review this request by opening the confirmation link below.
        </Text>
        <Text style={{ color: emailColors.accentStrong, fontSize: 13, lineHeight: "20px", margin: "8px 0 0", wordBreak: "break-word" }}>
          <Link href={confirmationLink} style={{ color: emailColors.accent, textDecoration: "underline" }}>
            {confirmationLink}
          </Link>
        </Text>
      </div>

      <Hr style={{ borderColor: emailColors.border, margin: "26px 0" }} />

      <Text style={{ color: emailColors.muted, fontSize: 13, lineHeight: "20px", margin: 0, textAlign: "center" }}>
        If you change your mind, you can always create a new account later.
      </Text>
    </EmailShell>
  );
};

DeleteAccountConfirmation.PreviewProps = {
  name: "Alex",
  confirmationLink: "/confirm-deletion?token=example123",
};

export default DeleteAccountConfirmation;
