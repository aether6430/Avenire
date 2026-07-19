// Get the full source code, including the theme and Tailwind config:
// https://github.com/resend/react-email/tree/canary/apps/demo/emails

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { DitherFonts } from './dither-fonts';
import { ditherTailwindConfig } from './theme';

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://avenire.space";

interface SubscriptionConfirmationProps {
  companyName: string;
  url: string;
  planName: string;
  userName: string;
  nextBillingDate: string;
}

export const SubscriptionConfirmation = ({
  companyName,
  url,
  planName,
  userName,
  nextBillingDate,
}: SubscriptionConfirmationProps) => {
  return (
    <Tailwind config={ditherTailwindConfig}>
      <Html>
        <Head>
          <DitherFonts />
        </Head>

        <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
          <Preview>
            You're on {planName} with {companyName}
          </Preview>
          <Container className="bg-bg mx-auto max-w-[640px]">
            <Section className="mobile:px-4 px-6 py-6">
              <Img
                src={`${baseUrl}/branding/avenire-logo-mark-white.svg`}
                alt=""
                width="32"
                height="32"
                className="block"
              />
            </Section>
            <Section className="mobile:px-4 px-6">
              <Img
                src={"https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0"}
                alt=""
                width={592}
                className="block w-full max-w-[592px]"
              />
            </Section>
            <Section
              align="left"
              className="mobile:px-4 mobile:pt-10 mobile:pb-16 px-6 pt-16 pb-24 text-left"
            >
              <Section
                align="left"
                className="mobile:mb-8 mobile:!max-w-full mb-12 max-w-[490px] text-left"
              >
                <Text className="font-56 font-condensed mobile:font-40 text-fg m-0 uppercase">
                  welcome to {planName}
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-6 font-sans">
                  Thanks for starting your {planName} subscription, {userName}.
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-[18px] font-sans">
                  Your payment method has been charged. The next charge will be
                  on{' '}
                  <span className="text-fg font-semibold">
                    {nextBillingDate}.
                  </span>
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-[18px] font-sans">
                  You can modify your payment method or cancel your subscription
                  anytime by visiting the {companyName}{' '}
                  <Link href={url} className="text-fg-2">
                    billing settings
                  </Link>{' '}
                  page.
                </Text>
              </Section>
              <Button
                href={url}
                className="bg-fg font-15 text-bg inline-block px-5 py-3.5 text-center font-sans"
              >
                Open {companyName}
              </Button>
            </Section>

            <Section className="mobile:px-4 mobile:pb-10 px-6 pb-14">
              <Text className="font-32 font-condensed mobile:font-24 text-fg m-0 uppercase">
                Get started
              </Text>

              <Section className="mobile:py-8 border-stroke border-b py-10">
                <Text className="font-20 font-condensed text-fg mb-4">
                  Set up your workspace
                </Text>
                <Text className="font-14 text-fg-2 m-0 my-3 font-sans">
                  Complete the basics to get the most out of your account.
                </Text>
                <Link
                  href="https://avenire.space/"
                  className="font-15 text-fg font-sans"
                >
                  Complete Setup
                </Link>
              </Section>

              <Section className="mobile:py-8 border-stroke border-b py-10">
                <Text className="font-20 font-condensed text-fg mb-4">
                  Invite your team
                </Text>
                <Text className="font-14 text-fg-2 m-0 my-3 font-sans">
                  Collaboration works best when everyone's in.
                </Text>
                <Link
                  href="https://avenire.space/"
                  className="font-15 text-fg font-sans"
                >
                  Invite Teammates
                </Link>
              </Section>

              <Section className="mobile:pt-10 pt-14">
                <Text className="font-15 text-fg m-0 font-sans">
                  Need help?
                </Text>
                <Text className="mobile:!max-w-full font-13 text-fg-2 m-0 mt-0.5 max-w-[490px] font-sans">
                  Find guides, tips, and best practices anytime, visit our{' '}
                  <Link href="https://avenire.space/" className="text-fg-2">
                    Help Center
                  </Link>
                  .
                </Text>
              </Section>
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
};

SubscriptionConfirmation.PreviewProps = {
  companyName: 'Avenire',
  url: 'https://avenire.space/',
  planName: 'Pro',
  userName: 'Alex',
  nextBillingDate: 'April 22, 2026',
} satisfies SubscriptionConfirmationProps;

export default SubscriptionConfirmation;
