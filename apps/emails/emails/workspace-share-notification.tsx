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

interface WorkspaceShareNotificationEmailProps {
  companyName?: string;
  sharedByName?: string;
  workspaceName: string;
  workspaceUrl: string;
}

export const WorkspaceShareNotificationEmail = ({
  companyName = "Avenire",
  workspaceName,
  workspaceUrl,
  sharedByName,
}: WorkspaceShareNotificationEmailProps) => {
  const sender = sharedByName?.trim() || "A teammate";

  return (
    <Tailwind config={ditherTailwindConfig}>
      <Html>
        <Head>
          <DitherFonts />
        </Head>

        <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
          <Preview>
            {sender} shared a workspace with you on {companyName}
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

            <Section className="mobile:px-4 px-6 mobile:pt-12 pt-20 mobile:pb-10 pb-14">
              <Section className="mb-12 mobile:mb-8">
                <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                  Workspace shared
                </Text>
                <Text className="m-0 mt-8 font-14 font-sans text-fg-2">
                  {sender} shared{" "}
                  <span className="font-semibold text-fg">{workspaceName}</span>{" "}
                  with you.
                </Text>
              </Section>

              <Button
                className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
                href={workspaceUrl}
              >
                Open workspace
              </Button>
            </Section>

            <Section className="mobile:px-4 px-6 mobile:pt-12 pt-16 mobile:pb-12 pb-16">
              <Text className="m-0 font-14 font-sans text-fg-2">
                If the button does not work, copy and paste this URL:
              </Text>
              <Text
                className="m-0 mt-2 font-13 font-sans text-fg"
                style={{ wordBreak: "break-word" }}
              >
                {workspaceUrl}
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
};

WorkspaceShareNotificationEmail.PreviewProps = {
  companyName: "Avenire",
  workspaceName: "Machine Learning Project",
  workspaceUrl: "https://avenire.space/workspace/ml-project",
  sharedByName: "Sarah",
};

export default WorkspaceShareNotificationEmail;
