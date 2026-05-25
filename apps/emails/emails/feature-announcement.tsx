// Get the full source code, including the theme and Tailwind config:
// https://github.com/resend/react-email/tree/canary/apps/demo/emails

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { DitherFonts } from "./dither-fonts";
import { ditherTailwindConfig } from "./theme";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://avenire.space";

interface FeatureAnnouncementEmailProps {
  companyName: string;
  url: string;
}

export const FeatureAnnouncementEmail = ({
  companyName,
  url,
}: FeatureAnnouncementEmailProps) => {
  const featureName = "Smart Tasks";
  const heroImageSrc =
    "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0";

  return (
    <Tailwind config={ditherTailwindConfig}>
      <Html>
        <Head>
          <DitherFonts />
        </Head>

        <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
          <Preview>Meet {featureName}</Preview>
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
                className="mobile:!max-w-full block w-full max-w-[592px]"
                src={heroImageSrc}
                width={592}
              />
            </Section>

            <Section className="mobile:px-4 px-6 mobile:pt-10 pt-14 mobile:pb-8 pb-12">
              <Text className="mobile:!max-w-full m-0 max-w-[490px] font-56 font-condensed mobile:font-40 text-fg uppercase">
                Meet a new way to manage work
              </Text>
              <Text className="mobile:!max-w-full m-0 mt-10 max-w-[490px] font-14 font-sans text-fg-2">
                Introducing {featureName}: a calmer way to organize work,
                surface what matters next, and keep your team aligned without
                the noise.
              </Text>
              <Section className="mt-10">
                <Button
                  className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
                  href={url}
                >
                  Explore {featureName}
                </Button>
              </Section>
            </Section>

            <Section className="mobile:px-4 px-6 mobile:pt-8 pt-10 mobile:pb-12 pb-16">
              <Text className="m-0 font-32 font-condensed mobile:font-24 text-fg uppercase">
                Meet smart tasks
              </Text>
              <Section className="pt-12">
                <Img
                  alt=""
                  className="mobile:!max-w-full block w-full max-w-[592px]"
                  src={heroImageSrc}
                  width={592}
                />
                <Text className="m-0 mt-8 font-20 font-condensed text-fg">
                  Auto-prioritization
                </Text>
                <Text className="m-0 my-3 font-14 font-sans text-fg-2">
                  All your tasks for the week are surfaced based on urgency and
                  impact.
                </Text>
                <Link className="font-15 font-sans text-fg" href={url}>
                  Explore {featureName}
                </Link>
              </Section>

              {["Less manual work", "Clear focus", "Better alignment"].map(
                (title, idx) => (
                  <Section
                    className={
                      idx === 0 ? "mobile:pt-10 pt-16" : "mobile:pt-8 pt-12"
                    }
                    key={title}
                  >
                    <Row className="align-top">
                      <Column className="mobile:!block mobile:!w-full mobile:!max-w-full w-[48%] mobile:pb-6 align-top">
                        <Img
                          alt=""
                          className="mobile:!max-w-full block w-full max-w-[269px]"
                          src={heroImageSrc}
                          width={269}
                        />
                      </Column>
                      <Column className="mobile:!block mobile:!w-full mobile:!max-w-full w-[52%] mobile:pl-0 pl-6 align-middle">
                        <Text className="m-0 font-20 font-condensed text-fg">
                          {title}
                        </Text>
                        <Text className="m-0 mt-3 font-14 font-sans text-fg-2">
                          {idx === 0
                            ? "Fewer status updates, more automated work."
                            : idx === 1
                              ? "Always know what to do next—less thrash, more momentum."
                              : "Your team stays in sync automatically."}
                        </Text>
                      </Column>
                    </Row>
                  </Section>
                )
              )}

              <Text className="mobile:!max-w-full m-0 mt-12 max-w-[456px] font-20">
                <span className="text-fg">
                  Smart Tasks analyzes your projects in real time and helps
                  organize{" "}
                </span>
                <span className="text-fg-3">
                  your workload automatically. As things change, your task list
                  updates so you&apos;re always focused on what matters most.
                </span>
              </Text>

              <Section align="left" className="pt-12">
                <Img
                  alt=""
                  className="mobile:!max-w-full mx-auto block w-full max-w-[592px]"
                  src={heroImageSrc}
                  width={592}
                />
                <Section
                  align="left"
                  className="mx-auto mt-6 max-w-[640px] border border-stroke bg-bg mobile:px-6 px-10 mobile:py-12 py-20 text-center"
                >
                  <Text className="m-0 font-14 font-sans text-fg">
                    &quot;Smart Tasks helps me know what to do next without
                    thinking about it.&quot;
                  </Text>
                  <Text className="m-0 mt-4 font-13 font-sans text-fg-2">
                    Alex, Product Designer at Studio
                  </Text>
                </Section>
              </Section>

              <Section className="mobile:pt-12 pt-18">
                <Text className="m-0 font-32 font-condensed mobile:font-24 text-fg uppercase">
                  Try smart tasks
                </Text>
                <Text className="m-0 mt-5 font-14 font-sans text-fg-2">
                  See how much easier work can be.
                </Text>
                <Section className="mt-8">
                  <Button
                    className="inline-block bg-fg px-5 py-3.5 text-center font-15 font-sans text-bg"
                    href={url}
                  >
                    Explore {featureName}
                  </Button>
                </Section>
              </Section>

              <Section className="mobile:pt-10 pt-14">
                <Text className="m-0 font-13 font-sans text-fg">
                  Need help?
                </Text>
                <Text className="mobile:!max-w-full m-0 mt-0.5 max-w-[490px] font-13 font-sans text-fg-2">
                  Find guides, tips, and best practices anytime, visit our{" "}
                  <Link className="text-fg-2" href="https://avenire.space/">
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
};

FeatureAnnouncementEmail.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
} satisfies FeatureAnnouncementEmailProps;

export default FeatureAnnouncementEmail;
