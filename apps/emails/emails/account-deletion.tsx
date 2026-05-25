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
  : "";

interface DeleteAccountConfirmationProps {
  companyName?: string;
  url: string;
}

export const DeleteAccountConfirmation = ({
  companyName = "Avenire",
  url = "https://avenire.space/",
}: DeleteAccountConfirmationProps) => (
  <Tailwind config={ditherTailwindConfig}>
    <Html>
      <Head>
        <DitherFonts />
      </Head>

      <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
        <Preview>Confirm your account deletion request</Preview>
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
                Confirm deletion
              </Text>
              <Text className="m-0 mt-8 font-14 font-sans text-fg-2">
                We received a request to delete your {companyName} account.
              </Text>
              <Text className="m-0 mt-[18px] font-13 font-sans text-fg-3">
                This is a destructive action. Confirm only if you want your
                account and associated access removed.
              </Text>
            </Section>

            <Button
              className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
              href={url}
            >
              Confirm deletion
            </Button>
          </Section>

          <Section className="mobile:px-4 px-6 mobile:pt-12 pt-16 mobile:pb-10 pb-14">
            <Text className="m-0 font-14 font-sans text-fg-2">
              If you didn&apos;t request this, simply ignore this email and your
              account will stay active.
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

DeleteAccountConfirmation.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
} satisfies DeleteAccountConfirmationProps;

export default DeleteAccountConfirmation;
