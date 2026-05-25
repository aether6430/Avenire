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

interface ActivationEmailProps {
  companyName: string;
  url: string;
}

export const ActivationEmail = ({ companyName, url }: ActivationEmailProps) => (
  <Tailwind config={ditherTailwindConfig}>
    <Html>
      <Head>
        <DitherFonts />
      </Head>

      <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
        <Preview>Confirm your email address</Preview>
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
          <Section className="mobile:px-4 px-6 mobile:py-10 py-14">
            <Section className="mb-12 mobile:mb-8">
              <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                almost there
              </Text>
              <Text className="m-0 mt-[18px] font-14 font-sans text-fg-2">
                Thank you for signing up for {companyName}.
              </Text>
              <Text className="m-0 font-14 font-sans text-fg-2">
                To verify your account, we just need to confirm your email.
              </Text>
              <Text className="m-0 mt-[18px] font-13 font-sans text-fg-3">
                If you didn&apos;t create an account, you can safely ignore this
                email.
              </Text>
            </Section>
            <Button
              className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
              href={url}
            >
              Confirm Email
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

ActivationEmail.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
} satisfies ActivationEmailProps;

export default ActivationEmail;
