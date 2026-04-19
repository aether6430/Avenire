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

interface SubscriptionUpdateProps {
  companyName: string;
  url: string;
  userName: string;
  planName: string;
  nextBillingDate: string;
}

export const SubscriptionUpdate = ({
  companyName,
  url,
  userName,
  planName,
  nextBillingDate,
}: SubscriptionUpdateProps) => {
  return (
    <Tailwind config={ditherTailwindConfig}>
      <Html>
        <Head>
          <DitherFonts />
        </Head>

        <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
          <Preview>
            Your {planName} plan with {companyName} renewed
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
            <Section className="mobile:px-4 mobile:pt-12 mobile:pb-10 px-6 pt-20 pb-14">
              <Section
                align="left"
                className="mobile:mb-8 mobile:!max-w-full mb-12 max-w-[480px]"
              >
                <Text className="font-56 font-condensed mobile:font-40 text-fg m-0 uppercase">
                  Plan renewed
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-8 font-sans">
                  Hi {userName}, your subscription has been renewed.
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-[18px] font-sans">
                  Your payment method has been charged. The next charge will be
                  on {nextBillingDate}. You can modify your payment method or
                  cancel your subscription anytime by visiting the {companyName}{' '}
                  billing settings page.
                </Text>
              </Section>
              <Button
                href={url}
                className="bg-fg font-15 text-bg inline-block px-5 py-3.5 text-center font-sans"
              >
                Manage subscription
              </Button>
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

SubscriptionUpdate.PreviewProps = {
  companyName: 'Avenire',
  url: 'https://avenire.space/',
  userName: 'Name Surname',
  planName: 'Pro',
  nextBillingDate: 'Jun 15, 2026',
} satisfies SubscriptionUpdateProps;

export default SubscriptionUpdate;
