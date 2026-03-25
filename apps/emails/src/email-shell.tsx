import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const BRAND = {
  background: "#eef4ef",
  card: "#ffffff",
  cardAlt: "#f7faf8",
  border: "#d7e2d9",
  ink: "#153122",
  muted: "#627164",
  accent: "#1f5b3a",
  accentSoft: "#e1efe5",
  accentStrong: "#102f1f",
};

function BrandMark() {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: BRAND.accentSoft,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 16,
        boxShadow: "0 6px 20px rgba(16, 47, 31, 0.08)",
        display: "inline-flex",
        height: 52,
        justifyContent: "center",
        width: 52,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          alignItems: "center",
          backgroundColor: BRAND.accent,
          borderRadius: 14,
          color: "#ffffff",
          display: "flex",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 29,
          fontWeight: 700,
          height: 34,
          justifyContent: "center",
          lineHeight: 1,
          width: 34,
        }}
      >
        A
      </div>
    </div>
  );
}

export function EmailShell({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BRAND.background,
          margin: 0,
          padding: "40px 16px",
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          color: BRAND.ink,
        }}
      >
        <Container
          style={{
            backgroundColor: BRAND.card,
            border: `1px solid ${BRAND.border}`,
            borderRadius: 28,
            boxShadow: "0 24px 60px rgba(16, 47, 31, 0.08)",
            margin: "0 auto",
            maxWidth: 600,
            overflow: "hidden",
          }}
        >
          <Section
            style={{
              background:
                "linear-gradient(180deg, rgba(31,91,58,0.08) 0%, rgba(31,91,58,0) 100%)",
              borderBottom: `1px solid ${BRAND.border}`,
              padding: "28px 32px 20px",
              textAlign: "center",
            }}
          >
            <BrandMark />
            <Text
              style={{
                color: BRAND.accentStrong,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: "36px",
                margin: "18px 0 0",
              }}
            >
              Avenire
            </Text>
          </Section>

          <Section style={{ padding: "32px" }}>{children}</Section>

          <Section
            style={{
              borderTop: `1px solid ${BRAND.border}`,
              backgroundColor: BRAND.cardAlt,
              padding: "20px 32px 28px",
            }}
          >
            <Text
              style={{
                color: BRAND.muted,
                fontSize: 12,
                lineHeight: "18px",
                margin: 0,
                textAlign: "center",
              }}
            >
              Avenire Inc.
            </Text>
            <Text
              style={{
                color: BRAND.muted,
                fontSize: 12,
                lineHeight: "18px",
                margin: "6px 0 0",
                textAlign: "center",
              }}
            >
              © {new Date().getFullYear()} Avenire. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailColors = BRAND;
