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
  code: string;
  companyName?: string;
  expiresInMinutes: number;
  url?: string;
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

      <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
        <Preview>Your {companyName} security verification code</Preview>
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
            <Section className="mb-12 mobile:mb-8">
              <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                Verify your action
              </Text>
              <Text className="m-0 mt-8 font-14 font-sans text-fg-2">
                Use the code below to confirm a sensitive {companyName} settings
                action.
              </Text>
            </Section>

            <Section className="border border-stroke py-8 text-center">
              <Text
                className="m-0 font-40 font-condensed text-fg"
                style={{ letterSpacing: "0.3em" }}
              >
                {code}
              </Text>
            </Section>
          </Section>

          <Section className="mobile:px-4 px-6 mobile:pt-12 pt-12 mobile:pb-12 pb-16">
            <Text className="m-0 font-14 font-sans text-fg-2">
              This code expires in {expiresInMinutes} minutes and can only be
              used once.
            </Text>
            <Text className="m-0 mt-4 font-13 font-sans text-fg-3">
              If you did not request this code, you can safely ignore this
              email.
            </Text>
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

SecurityVerificationCodeEmail.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
  code: "123456",
  expiresInMinutes: 10,
} satisfies SecurityVerificationCodeEmailProps;

export default SecurityVerificationCodeEmail;
