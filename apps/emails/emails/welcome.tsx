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
import { DitherFonts } from "./dither-fonts";
import { ditherTailwindConfig } from "./theme";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://avenire.space";

interface WelcomeEmailProps {
  companyName: string;
  url: string;
}

export const WelcomeEmail = ({ companyName, url }: WelcomeEmailProps) => (
  <Tailwind config={ditherTailwindConfig}>
    <Html>
      <Head>
        <DitherFonts />
      </Head>
      <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
        <Preview>Welcome to {companyName}</Preview>
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
          <Section className="mobile:px-4 px-6 mobile:pt-10 pt-16 mobile:pb-8 pb-12">
            <Section align="left">
              <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                Welcome to {companyName}
              </Text>
              <Text className="m-0 mt-10 font-14 font-sans text-fg-2">
                You can start exploring right away, set up your workspace, and
                invite your team if you&apos;re working with others.
              </Text>
            </Section>
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

          <Section className="mobile:px-4 px-6 mobile:pt-10 pt-16 mobile:pb-8 pb-12">
            <Text className="m-0 font-11 font-sans text-muted">
              If you need help getting started, we&apos;ve got you covered. Find
              guides, tips, and best practices anytime, visit our{" "}
              <Link className="text-muted" href="https://avenire.space/">
                Help Center
              </Link>
              .
            </Text>
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
              <Link className="font-15 font-sans text-fg" href={url}>
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
              <Link className="font-15 font-sans text-fg" href={url}>
                Invite Teammates
              </Link>
            </Section>

            <Section className="mobile:pt-10 pt-14">
              <Text className="m-0 font-15 font-sans text-fg">Need help?</Text>
              <Text className="m-0 mt-1 font-13 font-sans text-fg-2">
                Find guides, tips, and best practices anytime, visit our{" "}
                <Link className="text-fg-2" href={url}>
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

WelcomeEmail.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
