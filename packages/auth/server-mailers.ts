async function loadEmailer() {
  const emailerModule = await import("@avenire/emailer");

  return {
    Emailer: emailerModule.Emailer,
    renderDeleteAccountEmail: emailerModule.renderDeleteAccountEmail,
    renderFileShareNotificationEmail:
      emailerModule.renderFileShareNotificationEmail,
    renderPasswordResetEmail: emailerModule.renderPasswordResetEmail,
    renderSecurityVerificationCodeEmail:
      emailerModule.renderSecurityVerificationCodeEmail,
    renderVerificationEmail: emailerModule.renderVerificationEmail,
    renderWelcomeEmail: emailerModule.renderWelcomeEmail,
    renderWorkspaceShareNotificationEmail:
      emailerModule.renderWorkspaceShareNotificationEmail,
  };
}

export async function sendResetPasswordEmail(input: {
  email: string;
  name?: string | null;
  resetLink: string;
}) {
  const { Emailer, renderPasswordResetEmail } = await loadEmailer();
  const emailer = new Emailer();
  await emailer.send({
    to: [input.email],
    subject: "Reset your password",
    html: await renderPasswordResetEmail({
      name: input.name ?? "there",
      resetLink: input.resetLink,
    }),
  });
}

export async function sendVerificationEmail(input: {
  confirmationLink: string;
  email: string;
  name?: string | null;
}) {
  const { Emailer, renderVerificationEmail } = await loadEmailer();
  const emailer = new Emailer();
  await emailer.send({
    to: [input.email],
    subject: "Verify your email",
    html: await renderVerificationEmail({
      name: input.name ?? "there",
      confirmationLink: input.confirmationLink,
    }),
  });
}

export async function sendDeleteAccountVerificationEmail(input: {
  confirmationLink: string;
  email: string;
  name?: string | null;
}) {
  const { Emailer, renderDeleteAccountEmail } = await loadEmailer();
  const emailer = new Emailer();
  await emailer.send({
    to: [input.email],
    subject: "Confirm account deletion",
    html: await renderDeleteAccountEmail({
      name: input.name ?? "there",
      confirmationLink: input.confirmationLink,
    }),
  });
}

export async function sendWelcomeEmail(input: {
  email: string;
  name?: string | null;
}) {
  const { Emailer, renderWelcomeEmail } = await loadEmailer();
  const emailer = new Emailer();
  const html = await renderWelcomeEmail({
    companyName: input.name ?? "there",
  });
  console.log("[auth] rendered welcome email", { email: input.email });
  await emailer.send({
    to: [input.email],
    subject: "Welcome to Avenire",
    html,
  });
}

export async function sendFileShareEmail(input: {
  toEmail: string;
  fileName: string;
  shareUrl: string;
  sharedByName?: string;
}) {
  const { Emailer, renderFileShareNotificationEmail } = await loadEmailer();
  const emailer = new Emailer();
  await emailer.send({
    to: [input.toEmail],
    subject: `${input.sharedByName ?? "Someone"} shared a file with you`,
    html: await renderFileShareNotificationEmail({
      fileName: input.fileName,
      shareUrl: input.shareUrl,
      sharedByName: input.sharedByName,
    }),
  });
}

export async function sendWorkspaceShareEmail(input: {
  toEmail: string;
  workspaceName: string;
  workspaceUrl: string;
  sharedByName?: string;
}) {
  const { Emailer, renderWorkspaceShareNotificationEmail } =
    await loadEmailer();
  const emailer = new Emailer();
  await emailer.send({
    to: [input.toEmail],
    subject: `${input.sharedByName ?? "Someone"} shared a workspace with you`,
    html: await renderWorkspaceShareNotificationEmail({
      workspaceName: input.workspaceName,
      workspaceUrl: input.workspaceUrl,
      sharedByName: input.sharedByName,
    }),
  });
}

export async function sendSudoVerificationCodeEmail(input: {
  toEmail: string;
  code: string;
  expiresInMinutes: number;
}) {
  const { Emailer, renderSecurityVerificationCodeEmail } = await loadEmailer();
  const emailer = new Emailer();
  await emailer.send({
    to: [input.toEmail],
    subject: "Your Avenire security verification code",
    html: await renderSecurityVerificationCodeEmail({
      code: input.code,
      expiresInMinutes: input.expiresInMinutes,
    }),
  });
}
