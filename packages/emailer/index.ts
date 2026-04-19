import {
  ActivationEmail,
  DeleteAccountConfirmation,
  FileShareNotificationEmail,
  PasswordResetEmail,
  SecurityVerificationCodeEmail,
  WaitlistApprovalEmail,
  WaitlistWelcomeEmail,
  WelcomeEmail,
  WorkspaceShareNotificationEmail,
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
    createElement(ActivationEmail, {
      companyName: "Avenire",
      url: input.confirmationLink,
    })
  );
}

export function renderPasswordResetEmail(input: {
  name?: string;
  resetLink: string;
}) {
  return renderEmail(
    createElement(PasswordResetEmail, {
      companyName: "Avenire",
      url: input.resetLink,
    })
  );
}

export function renderDeleteAccountEmail(input: {
  name?: string;
  confirmationLink: string;
}) {
  return renderEmail(
    createElement(DeleteAccountConfirmation, {
      companyName: "Avenire",
      url: input.confirmationLink,
    })
  );
}

export function renderWelcomeEmail(input: {
  companyName?: string;
  dashboardUrl?: string;
}) {
  return renderEmail(
    createElement(WelcomeEmail, {
      companyName: input.companyName ?? "Avenire",
      url: input.dashboardUrl ?? "https://avenire.space/",
    })
  );
}

export function renderFileShareNotificationEmail(input: {
  fileName: string;
  shareUrl: string;
  sharedByName?: string;
}) {
  return renderEmail(
    createElement(FileShareNotificationEmail, {
      companyName: "Avenire",
      fileName: input.fileName,
      shareUrl: input.shareUrl,
      sharedByName: input.sharedByName,
    })
  );
}

export function renderWorkspaceShareNotificationEmail(input: {
  workspaceName: string;
  workspaceUrl: string;
  sharedByName?: string;
}) {
  return renderEmail(
    createElement(WorkspaceShareNotificationEmail, {
      companyName: "Avenire",
      workspaceName: input.workspaceName,
      workspaceUrl: input.workspaceUrl,
      sharedByName: input.sharedByName,
    })
  );
}

export function renderSecurityVerificationCodeEmail(input: {
  code: string;
  expiresInMinutes: number;
}) {
  return renderEmail(
    createElement(SecurityVerificationCodeEmail, {
      code: input.code,
      expiresInMinutes: input.expiresInMinutes,
    })
  );
}

export function renderWaitlistWelcomeEmail(input: {
  email: string;
  loginUrl: string;
}) {
  return renderEmail(
    createElement(WaitlistWelcomeEmail, {
      companyName: "Avenire",
      email: input.email,
      loginUrl: input.loginUrl,
    })
  );
}

export function renderWaitlistApprovalEmail(input: {
  name?: string;
  loginUrl: string;
}) {
  return renderEmail(
    createElement(WaitlistApprovalEmail, {
      companyName: "Avenire",
      name: input.name,
      loginUrl: input.loginUrl,
    })
  );
}