import * as React from "react";
import { Button, Heading, Hr, Text } from "@react-email/components";
import { EmailShell, emailColors } from "./email-shell";

interface WaitlistEmailProps {
  name?: string;
  email?: string;
  ctaLabel: string;
  ctaHref: string;
  headline: string;
  body: string;
  preview: string;
}

function WaitlistEmail({
  name,
  email,
  ctaLabel,
  ctaHref,
  headline,
  body,
  preview,
}: WaitlistEmailProps) {
  return (
    <EmailShell preview={preview}>
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
        {headline}
      </Heading>

      <Text
        style={{
          color: emailColors.muted,
          fontSize: 17,
          lineHeight: "28px",
          margin: "0 auto 24px",
          maxWidth: 540,
          textAlign: "center",
        }}
      >
        {body}
      </Text>

      <div
        style={{
          backgroundColor: emailColors.cardAlt,
          border: `1px solid ${emailColors.border}`,
          borderRadius: 22,
          marginBottom: 22,
          padding: 24,
        }}
      >
        <Text style={{ color: emailColors.ink, fontSize: 15, lineHeight: "24px", margin: 0 }}>
          {email ? (
            <>
              We’ll keep this address on the list: <strong>{email}</strong>.
            </>
          ) : (
            "We’ve saved your request and will keep you posted."
          )}
        </Text>
      </div>

      <div
        style={{
          backgroundColor: "#f1f6f2",
          border: `1px solid ${emailColors.border}`,
          borderLeft: `4px solid ${emailColors.accent}`,
          borderRadius: 20,
          marginBottom: 24,
          padding: 20,
          textAlign: "center",
        }}
      >
        <Text style={{ color: emailColors.ink, fontSize: 15, lineHeight: "24px", margin: "0 0 16px" }}>
          {name ? `Thanks, ${name}.` : "Thanks."}
        </Text>
        <Button
          href={ctaHref}
          style={{
            backgroundColor: emailColors.accent,
            borderRadius: 999,
            color: "#ffffff",
            display: "inline-block",
            fontSize: 15,
            fontWeight: 700,
            padding: "12px 20px",
            textDecoration: "none",
          }}
        >
          {ctaLabel}
        </Button>
      </div>

      <Text
        style={{
          color: emailColors.muted,
          fontSize: 13,
          lineHeight: "20px",
          margin: 0,
          textAlign: "center",
        }}
      >
        If you need help, just reply to this email.
      </Text>

      <Hr style={{ borderColor: emailColors.border, margin: "26px 0" }} />
      <Text style={{ color: emailColors.muted, fontSize: 13, lineHeight: "20px", margin: 0, textAlign: "center" }}>
        The Avenire Team
      </Text>
    </EmailShell>
  );
}

export function WaitlistWelcomeEmail(props: { email: string; loginUrl: string }) {
  return (
    <WaitlistEmail
      body="You’re officially on the waitlist. We’ll review requests and let you know once access is ready."
      ctaHref={props.loginUrl}
      ctaLabel="View the waitlist"
      email={props.email}
      headline="You're on the waitlist"
      preview="Thanks for joining the Avenire waitlist"
    />
  );
}

export function WaitlistApprovalEmail(props: { name?: string; loginUrl: string }) {
  return (
    <WaitlistEmail
      body="Your waitlist request has been approved. You can now create your account and start using Avenire."
      ctaHref={props.loginUrl}
      ctaLabel="Create your account"
      name={props.name}
      headline="You're approved"
      preview="Your Avenire access is ready"
    />
  );
}

export default WaitlistWelcomeEmail;
