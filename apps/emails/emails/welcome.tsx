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
} from '@react-email/components';
import { DitherFonts } from './dither-fonts';
import { ditherTailwindConfig } from './theme';

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
      <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
        <Preview>Welcome to {companyName}</Preview>
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
          <Section className="mobile:px-4 mobile:pt-10 mobile:pb-8 px-6 pt-16 pb-12">
            <Section align="left">
              <Text className="font-56 font-condensed mobile:font-40 text-fg m-0 uppercase">
                Welcome to {companyName}
              </Text>
              <Text className="font-14 text-fg-2 m-0 mt-10 font-sans">
                You can start exploring right away, set up your workspace, and
                invite your team if you&apos;re working with others.
              </Text>
            </Section>
          </Section>

          <Section className="mobile:px-4 px-6">
            <Img
              src={`${baseUrl}/images/banners/banner1.png`}
              alt=""
              width={592}
              className="block w-full max-w-[592px]"
            />
          </Section>

          <Section className="mobile:px-4 mobile:pt-10 mobile:pb-8 px-6 pt-16 pb-12">
            <Text className="font-11 text-muted m-0 font-sans">
              If you need help getting started, we&apos;ve got you covered. Find
              guides, tips, and best practices anytime, visit our{' '}
              <Link href="https://avenire.space/" className="text-muted">
                Help Center
              </Link>
              .
            </Text>
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
              <Link href={url} className="font-15 text-fg font-sans">
                Complete Setup
              </Link>
            </Section>

            <Section className="mobile:py-8 border-stroke border-b py-10">
              <Text className="font-20 font-condensed text-fg mb-4">
                Invite your team
              </Text>
              <Text className="font-14 text-fg-2 m-0 my-3 font-sans">
                Collaboration works best when everyone&apos;s in.
              </Text>
              <Link href={url} className="font-15 text-fg font-sans">
                Invite Teammates
              </Link>
            </Section>

            <Section className="mobile:pt-10 pt-14">
              <Text className="font-15 text-fg m-0 font-sans">Need help?</Text>
              <Text className="font-13 text-fg-2 m-0 mt-1 font-sans">
                Find guides, tips, and best practices anytime, visit our{' '}
                <Link href={url} className="text-fg-2">
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

WelcomeEmail.PreviewProps = {
  companyName: 'Avenire',
  url: 'https://avenire.space/',
} satisfies WelcomeEmailProps;

export default WelcomeEmail;