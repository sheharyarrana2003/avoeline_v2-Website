import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Button,
} from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Light-theme token hexes from `src/app/globals.css` (email clients ignore CSS vars).
 * --paper #FFFFFF, --ink #171717, --ink-soft #525252, --accent #6C5CE7, --canvas #f5f5f5
 */
const paper = "#FFFFFF";
const ink = "#171717";
const inkSoft = "#525252";
const accent = "#6C5CE7";
const canvas = "#f5f5f5";
const line = "#e5e5e5";

export type TransactionalEmailProps = {
  preview: string;
  heading: string;
  children: ReactNode;
  actionUrl?: string;
  actionLabel?: string;
};

export function TransactionalEmail({
  preview,
  heading,
  children,
  actionUrl,
  actionLabel,
}: TransactionalEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: "24px",
          backgroundColor: canvas,
          fontFamily: "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: ink,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            backgroundColor: paper,
            border: `1px solid ${line}`,
            borderRadius: "16px",
            padding: "32px",
          }}
        >
          <Text
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            Avoeline
          </Text>
          <Heading
            as="h1"
            style={{ margin: "0 0 16px", fontSize: "22px", fontWeight: 600, color: ink }}
          >
            {heading}
          </Heading>
          <Section>{children}</Section>
          {actionUrl && actionLabel ? (
            <Section style={{ marginTop: "24px" }}>
              <Button
                href={actionUrl}
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: ink,
                  color: paper,
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {actionLabel}
              </Button>
            </Section>
          ) : null}
          <Hr style={{ borderColor: line, margin: "28px 0 16px" }} />
          <Text style={{ margin: 0, fontSize: "12px", color: inkSoft }}>
            You received this because of activity on Avoeline. This is a transactional message, not
            a marketing list.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function BodyText({ children }: { children: ReactNode }) {
  return (
    <Text style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "1.6", color: inkSoft }}>
      {children}
    </Text>
  );
}
