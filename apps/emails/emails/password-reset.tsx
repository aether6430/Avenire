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
} from '@react-email/components';
import { DitherFonts } from './dither-fonts';
import { ditherTailwindConfig } from './theme';

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://avenire.space";

interface PasswordResetEmailProps {
  companyName: string;
  url: string;
}

export const PasswordResetEmail = ({
  companyName,
  url,
}: PasswordResetEmailProps) => (
  <Tailwind config={ditherTailwindConfig}>
    <Html>
      <Head>
        <DitherFonts />
      </Head>

      <Body className="bg-bg-2 font-14 m-0 p-0 font-sans">
        <Preview>Reset your password</Preview>
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
                password reset
              </Text>
              <Text className="font-14 text-fg-2 m-0 mt-8 font-sans">
                We received a request to reset your password for {companyName}.
              </Text>
              <Text className="font-13 text-fg-3 m-0 mt-[18px] font-sans">
                If you didn&apos;t request a reset, you can safely ignore this
                email.
              </Text>
            </Section>

            <Button
              href={url}
              className="bg-fg font-15 text-bg inline-block px-5 py-3.5 text-center font-sans"
            >
              Create New Password
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

PasswordResetEmail.PreviewProps = {
  companyName: 'Avenire',
  url: 'https://avenire.space/',
} satisfies PasswordResetEmailProps;

export default PasswordResetEmail;