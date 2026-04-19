// Get the full source code, including the theme and Tailwind config:
// https://github.com/resend/react-email/tree/canary/apps/demo/emails

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

interface TextOnlyEmailProps {
  companyName: string;
  url: string;
}

export const TextOnlyEmail = ({ companyName, url }: TextOnlyEmailProps) => {
  return (
    <Tailwind config={ditherTailwindConfig}>
      <Html>
        <Head>
          <DitherFonts />
        </Head>
        <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
          <Preview>A short note from the {companyName} team</Preview>
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

            <Section
              align="left"
              className="mobile:px-4 mobile:pt-12 mobile:pb-10 px-6 pt-20 pb-14"
            >
              <Text className="mobile:!max-w-full font-40 font-condensed mobile:font-32 text-fg m-0 mb-6 max-w-[490px] uppercase">
                A note from us
              </Text>
              <Section
                align="left"
                className="mobile:!max-w-full max-w-[490px]"
              >
                <Text className="font-14 text-fg-2 m-0 font-sans">
                  We don&apos;t send long emails often. When we do, we keep them
                  plain—no hero, no clutter—just a direct word from the team
                  behind {companyName}.
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-[18px] font-sans">
                  We&apos;re building {companyName} so your team can see what
                  matters, drop what doesn&apos;t, and ship without living in
                  fifteen tabs. If you&apos;ve been in the product lately, thank
                  you—your feedback sharpens what we ship next.
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-[18px] font-sans">
                  Here&apos;s to clearer priorities and less noise. When
                  you&apos;re ready to jump back in, we&apos;ll be there.
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-[18px] font-sans">
                  — The {companyName} team
                </Text>
                <Text className="font-14 text-fg-2 m-0 mt-[18px] font-sans">
                  <Link href={url} className="text-fg">
                    Open {companyName}
                  </Link>
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

TextOnlyEmail.PreviewProps = {
  companyName: 'Avenire',
  url: 'https://avenire.space/',
} satisfies TextOnlyEmailProps;

export default TextOnlyEmail;
