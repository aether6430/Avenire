import {
  DeleteAccountConfirmation,
  EmailConfirmation,
  PasswordReset,
  WelcomeEmail,
} from "@avenire/emails";
import { type Options, render } from "@react-email/components";
import type { ReactElement } from "react";
import { createElement } from "react";
import { Resend } from "resend";

export class Emailer {
  private readonly client: Resend;
  private readonly defaultFrom: string;

  constructor() {
    this.client = new Resend(process.env.RESEND_API_KEY);
    this.defaultFrom =
      process.env.EMAIL_FROM ?? "Avenire <noreply@example.com>";
  }

  async send(input: {
    to: string[];
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
  }) {
    return this.client.emails.send({
      from: input.from ?? this.defaultFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
    });
  }
}

export const renderEmail = (element: ReactElement, options?: Options) =>
  render(element, options);

export function renderVerificationEmail(input: {
  name?: string;
  confirmationLink: string;
}) {
  return renderEmail(
    createElement(EmailConfirmation, {
      name: input.name ?? "there",
      confirmationLink: input.confirmationLink,
    })
  );
}

export function renderPasswordResetEmail(input: {
  name?: string;
  resetLink: string;
}) {
  return renderEmail(
    createElement(PasswordReset, {
      name: input.name ?? "there",
      resetLink: input.resetLink,
    })
  );
}

export function renderDeleteAccountEmail(input: {
  name?: string;
  confirmationLink: string;
}) {
  return renderEmail(
    createElement(DeleteAccountConfirmation, {
      name: input.name ?? "there",
      confirmationLink: input.confirmationLink,
    })
  );
}

export function renderWelcomeEmail(input: {
  name?: string;
  dashboardUrl?: string;
}) {
  return renderEmail(
    createElement(WelcomeEmail, {
      name: input.name ?? "there",
      dashboardUrl: input.dashboardUrl ?? "https://avenire.com/dashboard",
    })
  );
}
