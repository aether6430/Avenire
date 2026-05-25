// Get the full source code, including the theme and Tailwind config:
// https://github.com/resend/react-email/tree/canary/apps/demo/emails

import {
  Body,
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

interface ProductUpdateFeature {
  body: string;
  imageSrc: string;
  linkHref: string;
  linkText: string;
  title: string;
}

const productUpdateHeadline = "THE WORK BEHIND THE WORK";

interface ProductUpdateEmailProps {
  companyName: string;
  url: string;
}

export const ProductUpdateEmail = ({
  companyName,
  url,
}: ProductUpdateEmailProps) => {
  const featureRows: ProductUpdateFeature[] = [
    {
      title: "Auto-prioritization",
      body: "All your tasks for the week are surfaced based on urgency and impact.",
      linkText: "Explore Smart Tasks",
      linkHref: url,
      imageSrc:
        "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0",
    },
    {
      title: "Less manual work",
      body: "Fewer status updates, more automated work.",
      linkText: "Read more",
      linkHref: url,
      imageSrc:
        "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0",
    },
    {
      title: "Less manual work",
      body: "Fewer status updates, more automated work.",
      linkText: "Read more",
      linkHref: url,
      imageSrc:
        "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0",
    },
  ];

  return (
    <Tailwind config={ditherTailwindConfig}>
      <Html>
        <Head>
          <DitherFonts />
        </Head>
        <Body className="m-0 bg-bg-2 p-0 font-14 font-sans">
          <Preview>What&apos;s new in {companyName}</Preview>
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

            <Section className="mobile:mt-8 mt-12 mobile:px-4 px-6 pb-2">
              <Img
                alt=""
                className="mobile:!max-w-full block w-full max-w-[592px]"
                src={
                  "https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0"
                }
                width={592}
              />
              <Row align="left">
                <Column align="left" className="w-full">
                  <Section
                    align="left"
                    className="mobile:!max-w-full mt-12 mb-6 w-full max-w-[480px] text-left"
                  >
                    <Text className="m-0 font-56 font-condensed mobile:font-40 text-fg uppercase">
                      {productUpdateHeadline}
                    </Text>
                  </Section>
                </Column>
              </Row>
            </Section>

            <Section className="mobile:px-4 px-6 pb-16">
              <Text className="m-0 mb-4 font-14 text-fg-2">
                Here from the {companyName} team.
              </Text>
              <Text className="m-0 mb-4 font-14 text-fg-2">
                This month was about making {companyName} feel smoother, faster,
                and easier to use in everyday work.
              </Text>
              <Text className="m-0 mb-4 font-14 text-fg-2">
                We shipped new features, improved key workflows, and made small
                but meaningful updates that reduce friction across the product.
              </Text>
              <Text className="m-0 mb-4 font-14 text-fg-2">
                A lot of our focus was on simplifying actions, improving
                performance, and responding to feedback from teams using the
                product day to day.
              </Text>
              <Text className="m-0 font-14 text-fg-2">
                We&apos;re continuing to shape {companyName} around real
                workflows—not just features—so everything feels more connected
                and effortless over time.
              </Text>
            </Section>

            <Section className="mobile:px-4 px-6 pb-16">
              <Text className="m-0 font-32 font-condensed mobile:font-24 text-fg uppercase">
                WE LAUNCHED SMART TASKS
              </Text>
              <Section className="mt-12">
                <Img
                  alt=""
                  className="mobile:!max-w-full block w-full max-w-[560px]"
                  src={featureRows[0].imageSrc}
                  width={560}
                />
                <Text className="m-0 mt-8 font-20 font-condensed text-fg">
                  {featureRows[0].title}
                </Text>
                <Text className="m-0 mt-3.5 font-14 text-fg-2">
                  {featureRows[0].body}
                </Text>
                <Link
                  className="mt-3 inline-block font-15 text-fg-2"
                  href={featureRows[0].linkHref}
                >
                  {featureRows[0].linkText}
                </Link>
              </Section>
            </Section>

            <Section className="mobile:px-4 px-6 pb-12">
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
            </Section>

            <Section className="mobile:px-4 px-6 pb-16">
              <Text className="m-0 font-32 font-condensed mobile:font-24 text-fg uppercase">
                READ MORE ON OUR BLOG
              </Text>
              <Section className="mt-12">
                <Row>
                  <Column className="mobile:!block mobile:!w-full mobile:!max-w-full w-[50%] mobile:pr-0 pr-2.5 mobile:pb-10 align-top">
                    <Img
                      alt=""
                      className="mobile:!max-w-full block w-full max-w-[269px]"
                      src={featureRows[1].imageSrc}
                      width={269}
                    />
                    <Section className="pt-6">
                      <Text className="m-0 font-20 font-condensed text-fg">
                        {featureRows[1].title}
                      </Text>
                      <Text className="m-0 mt-2 font-14 text-fg-2">
                        {featureRows[1].body}
                      </Text>
                      <Link
                        className="mt-3 inline-block font-15 text-fg-2"
                        href={featureRows[1].linkHref}
                      >
                        {featureRows[1].linkText}
                      </Link>
                    </Section>
                  </Column>
                  <Column className="mobile:!block mobile:!w-full mobile:!max-w-full w-[50%] mobile:pl-0 pl-2.5 align-top">
                    <Img
                      alt=""
                      className="mobile:!max-w-full block w-full max-w-[269px]"
                      src={featureRows[2].imageSrc}
                      width={269}
                    />
                    <Section className="pt-6">
                      <Text className="m-0 font-20 font-condensed text-fg">
                        {featureRows[2].title}
                      </Text>
                      <Text className="m-0 mt-2 font-14 text-fg-2">
                        {featureRows[2].body}
                      </Text>
                      <Link
                        className="mt-3 inline-block font-15 text-fg-2"
                        href={featureRows[2].linkHref}
                      >
                        {featureRows[2].linkText}
                      </Link>
                    </Section>
                  </Column>
                </Row>
              </Section>
            </Section>

            <Section className="mobile:px-4 px-6 pb-16">
              <Text className="m-0 font-13 font-sans text-fg">Need help?</Text>
              <Text className="m-0 mt-0.5 font-13 font-sans text-fg-2">
                Find guides, tips, and best practices anytime, visit our Help
                Center.
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

ProductUpdateEmail.PreviewProps = {
  companyName: "Avenire",
  url: "https://avenire.space/",
} satisfies ProductUpdateEmailProps;

export default ProductUpdateEmail;
