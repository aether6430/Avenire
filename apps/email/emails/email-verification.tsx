import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VerificationLinkProps {
  verificationLink?: string;
  username?: string;
}

const baseUrl = `https://${process.env.BASE_URL}`;

export const VerificationLink = ({
  verificationLink,
  username,
}: VerificationLinkProps) => (
  <Html>
    <Head />
    <Preview>Click here to verify your mail.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/logo-light.svg`}
          width={48}
          height={48}
          alt="Avenire"
        />
        <Heading style={heading}>🪄 Your verification link</Heading>
        <Section style={body}>
          <Text style={paragraph}>
            Hey there, {username} almost there, just click
            <Link style={link} href={verificationLink}>
              here
            </Link>
            to verify your email.
          </Text>
          <Text style={paragraph}>
            If you didn't request this, please ignore this email.
          </Text>
        </Section>
        <Text style={paragraph}>
          Best,
          <br />- Avenire Team
        </Text>
        <Hr style={hr} />
        <Img
          src={`${baseUrl}/logo-light.svg`}
          width={32}
          height={32}
          style={{
            WebkitFilter: "grayscale(100%)",
            filter: "grayscale(100%)",
            margin: "20px 0",
          }}
        />
        <Text style={footer}>Avenire Technologies Inc.</Text>
      </Container>
    </Body>
  </Html>
);

export default VerificationLink;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 25px 48px",
  backgroundImage: 'url("/static/raycast-bg.png")',
  backgroundPosition: "bottom",
  backgroundRepeat: "no-repeat, no-repeat",
};

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  marginTop: "48px",
};

const body = {
  margin: "24px 0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const link = {
  color: "#FF6363",
};

const hr = {
  borderColor: "#dddddd",
  marginTop: "48px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  marginLeft: "4px",
};
