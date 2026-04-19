import {
  Body,
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
  : "";

interface SecurityVerificationCodeEmailProps {
  companyName?: string;
  url?: string;
  code: string;
  expiresInMinutes: number;
}

export const SecurityVerificationCodeEmail = ({
  companyName = "Avenire",
  url = "https://avenire.space/",
  code,
  expiresInMinutes,
}: SecurityVerificationCodeEmailProps) => (
  <Tailwind config={ditherTailwindConfig}>
    <Html>
      <Head>
        <DitherFonts />
      </Head>

      <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
        <Preview>Your {companyName} security verification code</Preview>
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
            <Section className="mobile:mb-8 mb-12">
              <Text className="font-56 font-condensed mobile:font-40 text-fg m-0 uppercase">
                Verify your action
              </Text>
              <Text className="font-14 text-fg-2 m-0 mt-8 font-sans">
                Use the code below to confirm a sensitive {companyName} settings action.
              </Text>
            </Section>

            <Section className="border-stroke border py-8 text-center">
              <Text className="font-40 font-condensed text-fg m-0" style={{ letterSpacing: "0.3em" }}>
                {code}
              </Text>
            </Section>
          </Section>

          <Section className="mobile:px-4 mobile:pt-12 mobile:pb-12 px-6 pt-12 pb-16">
            <Text className="font-14 text-fg-2 m-0 font-sans">
              This code expires in {expiresInMinutes} minutes and can only be used once.
            </Text>
            <Text className="font-13 text-fg-3 m-0 mt-4 font-sans">
              If you did not request this code, you can safely ignore this email.
            </Text>
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

SecurityVerificationCodeEmail.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
  code: "123456",
  expiresInMinutes: 10,
} satisfies SecurityVerificationCodeEmailProps;

export default SecurityVerificationCodeEmail;