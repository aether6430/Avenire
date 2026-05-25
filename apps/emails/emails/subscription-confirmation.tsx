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
} from "@react-email/components";
import { DitherFonts } from "./dither-fonts";
import { ditherTailwindConfig } from "./theme";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://avenire.space";

interface SubscriptionConfirmationProps {
  companyName: string;
  nextBillingDate: string;
  planName: string;
  url: string;
  userName: string;
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

        <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
          <Preview>
            You&apos;re on {planName} with {companyName}
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
            <Section className="mobile:px-4 px-6">
              <Img
                alt=""
                className="block w-full max-w-[592px]"
                src={
                  "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0"
                }
                width={592}
              />
            </Section>
            <Section
              align="left"
              className="mobile:px-4 px-6 mobile:pt-10 pt-16 mobile:pb-16 pb-24 text-left"
            >
              <Section
                align="left"
                className="mobile:!max-w-full mb-12 mobile:mb-8 max-w-[490px] text-left"
              >
                <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                  welcome to {planName}
                </Text>
                <Text className="m-0 mt-6 font-14 font-sans text-fg-2">
                  Thanks for starting your {planName} subscription, {userName}.
                </Text>
                <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                  Your payment method has been charged. The next charge will be
                  on{" "}
                  <span className="font-semibold text-fg">
                    {nextBillingDate}.
                  </span>
                </Text>
                <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                  You can modify your payment method or cancel your subscription
                  anytime by visiting the {companyName}{" "}
                  <Link className="text-fg-2" href={url}>
                    billing settings
                  </Link>{" "}
                  page.
                </Text>
              </Section>
              <Button
                className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
                href={url}
              >
                Open {companyName}
              </Button>
            </Section>

            <Section className="mobile:px-4 px-6 mobile:pb-10 pb-14">
              <Text className="m-0 font-32 font-condensed mobile:font-24 text-fg uppercase">
                Get started
              </Text>

              <Section className="border-stroke border-b mobile:py-8 py-10">
                <Text className="mb-4 font-20 font-condensed text-fg">
                  Set up your workspace
                </Text>
                <Text className="m-0 my-3 font-14 font-sans text-fg-2">
                  Complete the basics to get the most out of your account.
                </Text>
                <Link
                  className="font-15 font-sans text-fg"
                  href="https://avenire.space/"
                >
                  Complete Setup
                </Link>
              </Section>

              <Section className="border-stroke border-b mobile:py-8 py-10">
                <Text className="mb-4 font-20 font-condensed text-fg">
                  Invite your team
                </Text>
                <Text className="m-0 my-3 font-14 font-sans text-fg-2">
                  Collaboration works best when everyone&apos;s in.
                </Text>
                <Link
                  className="font-15 font-sans text-fg"
                  href="https://avenire.space/"
                >
                  Invite Teammates
                </Link>
              </Section>

              <Section className="mobile:pt-10 pt-14">
                <Text className="m-0 font-15 font-sans text-fg">
                  Need help?
                </Text>
                <Text className="mobile:!max-w-full m-0 mt-0.5 max-w-[490px] font-13 font-sans text-fg-2">
                  Find guides, tips, and best practices anytime, visit our{" "}
                  <Link className="text-fg-2" href="https://avenire.space/">
                    Help Center
                  </Link>
                  .
                </Text>
              </Section>
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

SubscriptionConfirmation.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
  planName: "Pro",
  userName: "Alex",
  nextBillingDate: "April 22, 2026",
} satisfies SubscriptionConfirmationProps;

export default SubscriptionConfirmation;
