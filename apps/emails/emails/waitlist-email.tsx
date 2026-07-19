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
  companyName?: string;
  name?: string;
  email?: string;
  ctaLabel: string;
  ctaHref: string;
  headline: string;
  body: string;
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

        <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
          <Preview>{preview}</Preview>
          <Container className="bg-bg mx-auto max-w-[640px]">
            <Section className="mobile:px-4 px-6 py-6">
              <Img
                src={`${baseUrl}/branding/avenire-logo-full.png`}
                alt="Avenire"
                width="32"
                height="32"
                className="block"
              />
            </Section>

            <Section className="mobile:px-4 mobile:pt-12 mobile:pb-10 px-6 pt-20 pb-14">
              <Section className="mobile:mb-8 mb-12">
                <Text className="font-56 font-condensed mobile:font-40 text-fg m-0 uppercase">
                  {headline}
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-8 font-sans">
                  {body}
                </Text>
              </Section>

              <Link
                href={ctaHref}
                className="bg-fg font-15 text-bg inline-block px-5 py-3.5 text-center font-sans"
              >
                {ctaLabel}
              </Link>
            </Section>

            <Section className="mobile:px-4 mobile:pt-12 mobile:pb-12 px-6 pt-16 pb-16">
              <Text className="font-14 text-fg-2 m-0 font-sans">
                {email ? (
                  <>
                    We'll keep this address on the list: <span className="text-fg font-semibold">{email}</span>.
                  </>
                ) : (
                  "We've saved your request and will keep you posted."
                )}
              </Text>
              {name && (
                <Text className="font-14 text-fg-2 m-0 mt-4 font-sans">
                  Thanks, {name}.
                </Text>
              )}
            </Section>

            <Section className="mobile:px-4 mobile:py-12 border-stroke border-t px-6 py-16">
              <Text className="font-13 text-fg-2 m-0 font-sans">
                Avenire brings your entire learning life into one place — notes, an AI tutor that knows your material, a live map of your understanding, and revision that actually adapts to you.
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export function WaitlistWelcomeEmail(props: { companyName?: string; email: string; loginUrl: string }) {
  return (
    <WaitlistEmail
      companyName={props.companyName}
      body="You're officially on the waitlist. We'll review requests and let you know once access is ready."
      ctaHref={props.loginUrl}
      ctaLabel="View the waitlist"
      email={props.email}
      headline="You're on the waitlist"
      preview="Thanks for joining the Avenire waitlist"
    />
  );
}

export function WaitlistApprovalEmail(props: { companyName?: string; name?: string; loginUrl: string }) {
  return (
    <WaitlistEmail
      companyName={props.companyName}
      body="Your waitlist request has been approved. You can now create your account and start using Avenire."
      ctaHref={props.loginUrl}
      ctaLabel="Create your account"
      name={props.name}
      headline="You're approved"
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
