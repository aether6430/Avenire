import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { ditherTailwindConfig } from "./theme";

const baseUrl = "https://avenire.space";

interface WaitlistEmailProps {
  body: string;
  companyName?: string;
  ctaHref: string;
  ctaLabel: string;
  email?: string;
  headline: string;
  name?: string;
  preview: string;
}

function WaitlistEmail({
  companyName = "Avenire",
  name,
  email,
  ctaLabel,
  ctaHref,
  headline,
  body,
  preview,
}: WaitlistEmailProps) {
  return (
    <Tailwind config={ditherTailwindConfig}>
      <Html>
        <Head />

        <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
          <Preview>{preview}</Preview>
          <Container className="mx-auto max-w-[640px] bg-bg">
            <Section className="mobile:px-4 px-6 py-6">
              <Img
                alt="Avenire"
                className="block"
                height="28"
                src={`${baseUrl}/branding/avenire-logo-full.png`}
                width="128"
              />
            </Section>

            <Section className="mobile:px-4 px-6 mobile:pt-12 pt-20 mobile:pb-10 pb-14">
              <Section className="mb-12 mobile:mb-8">
                <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                  {headline}
                </Text>
                <Text className="m-0 mt-8 font-14 font-sans text-fg-2">
                  {body}
                </Text>
              </Section>

              <Link
                className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
                href={ctaHref}
              >
                {ctaLabel}
              </Link>
            </Section>

            <Section className="mobile:px-4 px-6 mobile:pt-12 pt-16 mobile:pb-12 pb-16">
              <Text className="m-0 font-14 font-sans text-fg-2">
                {email ? (
                  <>
                    We&apos;ll keep this address on the list:{" "}
                    <span className="font-semibold text-fg">{email}</span>.
                  </>
                ) : (
                  "We&apos;ve saved your request and will keep you posted."
                )}
              </Text>
              {name && (
                <Text className="m-0 mt-4 font-14 font-sans text-fg-2">
                  Thanks, {name}.
                </Text>
              )}
            </Section>

            <Section className="border-stroke border-t mobile:px-4 px-6 mobile:py-12 py-16">
              <Text className="m-0 font-13 font-sans text-fg-2">
                Avenire brings your entire learning life into one place — notes,
                an AI tutor that knows your material, a live map of your
                understanding, and revision that actually adapts to you.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export function WaitlistWelcomeEmail(props: {
  companyName?: string;
  email: string;
  loginUrl: string;
}) {
  return (
    <WaitlistEmail
      body="You're officially on the waitlist. We'll review requests and let you know once access is ready."
      companyName={props.companyName}
      ctaHref={props.loginUrl}
      ctaLabel="View the waitlist"
      email={props.email}
      headline="You're on the waitlist"
      preview="Thanks for joining the Avenire waitlist"
    />
  );
}

export function WaitlistApprovalEmail(props: {
  companyName?: string;
  name?: string;
  loginUrl: string;
}) {
  return (
    <WaitlistEmail
      body="Your waitlist request has been approved. You can now create your account and start using Avenire."
      companyName={props.companyName}
      ctaHref={props.loginUrl}
      ctaLabel="Create your account"
      headline="You're approved"
      name={props.name}
      preview="Your Avenire access is ready"
    />
  );
}

WaitlistWelcomeEmail.PreviewProps = {
  companyName: "Avenire",
  email: "alex@example.com",
  loginUrl: "https://avenire.space/waitlist",
};

WaitlistApprovalEmail.PreviewProps = {
  companyName: "Avenire",
  name: "Alex",
  loginUrl: "https://avenire.space/signup",
};

export default WaitlistWelcomeEmail;
