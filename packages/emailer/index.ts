import { render, type Options } from "@react-email/components";
import nodemailer, { createTransport } from "nodemailer";
import { ReactElement } from "react";

export class Emailer {
  private transporter;

  constructor() {
    this.transporter = createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  }

  async send(
    from: string,
    to: string[],
    subject: string,
    html: string,
    attachments?: { path: string; filename: string }[]
  ) {
    const options = {
      from,
      to,
      subject,
      html,
      attachments,
    };

    const info = await this.transporter.sendMail(options);
    return info;
  }
}

export const renderEmail = (element: ReactElement, options?: Options) => {
  return render(element, options);
};
