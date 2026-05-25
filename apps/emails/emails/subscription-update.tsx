// Get the full source code, including the theme and Tailwind config:
// https://github.com/resend/react-email/tree/canary/apps/demo/emails

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { DitherFonts } from "./dither-fonts";
import { ditherTailwindConfig } from "./theme";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://avenire.space";

interface SubscriptionUpdateProps {
  companyName: string;
  nextBillingDate: string;
  planName: string;
  url: string;
  userName: string;
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

        <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
          <Preview>
            Your {planName} plan with {companyName} renewed
          </Preview>
          <Container className="mx-auto max-w-[640px] bg-bg">
            <Section className="mobile:px-4 px-6 py-6">
              <Img
                alt=""
                className="block"
                height="32"
                src={`${baseUrl}/branding/avenire-logo-mark-white.svg`}
                width="32"
              />
            </Section>
            <Section className="mobile:px-4 px-6 mobile:pt-12 pt-20 mobile:pb-10 pb-14">
              <Section
                align="left"
                className="mobile:!max-w-full mb-12 mobile:mb-8 max-w-[480px]"
              >
                <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                  Plan renewed
                </Text>
                <Text className="m-0 mt-8 font-14 font-sans text-fg-2">
                  Hi {userName}, your subscription has been renewed.
                </Text>
                <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                  Your payment method has been charged. The next charge will be
                  on {nextBillingDate}. You can modify your payment method or
                  cancel your subscription anytime by visiting the {companyName}{" "}
                  billing settings page.
                </Text>
              </Section>
              <Button
                className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
                href={url}
              >
                Manage subscription
              </Button>
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
};

SubscriptionUpdate.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
  userName: "Name Surname",
  planName: "Pro",
  nextBillingDate: "Jun 15, 2026",
} satisfies SubscriptionUpdateProps;

export default SubscriptionUpdate;
