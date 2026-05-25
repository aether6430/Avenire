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
} from "@react-email/components";
import { DitherFonts } from "./dither-fonts";
import { ditherTailwindConfig } from "./theme";

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
        <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
          <Preview>A short note from the {companyName} team</Preview>
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

            <Section
              align="left"
              className="mobile:px-4 px-6 mobile:pt-12 pt-20 mobile:pb-10 pb-14"
            >
              <Text className="mobile:!max-w-full m-0 mb-6 max-w-[490px] font-40 font-condensed mobile:font-32 text-fg uppercase">
                A note from us
              </Text>
              <Section
                align="left"
                className="mobile:!max-w-full max-w-[490px]"
              >
                <Text className="m-0 font-14 font-sans text-fg-2">
                  We don&apos;t send long emails often. When we do, we keep them
                  plain—no hero, no clutter—just a direct word from the team
                  behind {companyName}.
                </Text>
                <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                  We&apos;re building {companyName} so your team can see what
                  matters, drop what doesn&apos;t, and ship without living in
                  fifteen tabs. If you&apos;ve been in the product lately, thank
                  you—your feedback sharpens what we ship next.
                </Text>
                <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                  Here&apos;s to clearer priorities and less noise. When
                  you&apos;re ready to jump back in, we&apos;ll be there.
                </Text>
                <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                  — The {companyName} team
                </Text>
                <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                  <Link className="text-fg" href={url}>
                    Open {companyName}
                  </Link>
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

TextOnlyEmail.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
} satisfies TextOnlyEmailProps;

export default TextOnlyEmail;
