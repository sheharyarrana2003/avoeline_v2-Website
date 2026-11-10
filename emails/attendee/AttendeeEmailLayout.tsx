import React from "react";
import {
  Body,
  Button,
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
import type { ReactNode } from "react";

const paper = "#FFFFFF";
const ink = "#171717";
const inkSoft = "#525252";
const canvas = "#f5f5f5";
const line = "#e5e5e5";
const chipBg = "#f0f0f0";

export type AttendeeEmailLayoutProps = {
  preview: string;
  organizerName: string;
  bannerUrl?: string | null;
  title: string;
  statusLabel?: string | null;
  details: Array<{ label: string; value: string; href?: string }>;
  primaryCta?: { label: string; url: string } | null;
  googleCalendarUrl?: string | null;
  icsUrl?: string | null;
  replyTo?: string | null;
  children?: ReactNode;
};

export function AttendeeEmailLayout({
  preview,
  organizerName,
  bannerUrl,
  title,
  statusLabel,
  details,
  primaryCta,
  googleCalendarUrl,
  icsUrl,
  replyTo,
  children,
}: AttendeeEmailLayoutProps) {
  return (
    <Html>
      <Head>
        <style>{`
          @media (prefers-color-scheme: dark) {
            .avl-body { background-color: #0a0a0a !important; color: #f5f5f5 !important; }
            .avl-card { background-color: #171717 !important; border-color: #404040 !important; }
            .avl-ink { color: #f5f5f5 !important; }
            .avl-soft { color: #a3a3a3 !important; }
            .avl-chip { background-color: #262626 !important; color: #f5f5f5 !important; }
            .avl-row { border-color: #404040 !important; }
            .avl-cta { background-color: #f5f5f5 !important; color: #171717 !important; }
          }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="avl-body"
        style={{
          margin: 0,
          padding: "24px 12px",
          backgroundColor: canvas,
          fontFamily: "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: ink,
        }}
      >
        <Container
          className="avl-card"
          style={{
            maxWidth: "600px",
            width: "100%",
            backgroundColor: paper,
            border: `1px solid ${line}`,
            borderRadius: "12px",
            padding: "28px 24px",
          }}
        >
          <Text
            className="avl-soft"
            style={{ margin: "0 0 4px", fontSize: "12px", color: inkSoft }}
          >
            {organizerName}
          </Text>
          {bannerUrl ? (
            <Img
              src={bannerUrl}
              alt={`${organizerName} event banner`}
              width={552}
              style={{
                display: "block",
                width: "100%",
                maxWidth: "552px",
                height: "auto",
                maxHeight: "140px",
                objectFit: "cover",
                borderRadius: "8px",
                margin: "8px 0 16px",
              }}
            />
          ) : null}

          <Heading
            as="h1"
            className="avl-ink"
            style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 600, color: ink }}
          >
            {title}
          </Heading>
          {statusLabel ? (
            <Text
              className="avl-chip"
              style={{
                display: "inline-block",
                margin: "0 0 16px",
                padding: "4px 10px",
                borderRadius: "999px",
                backgroundColor: chipBg,
                fontSize: "12px",
                fontWeight: 600,
                color: ink,
              }}
            >
              {statusLabel}
            </Text>
          ) : null}

          {details.length ? (
            <Section
              style={{
                margin: "0 0 20px",
                border: `1px solid ${line}`,
                borderRadius: "8px",
                padding: "12px 14px",
              }}
            >
              {details.map((row) => (
                <Text
                  key={`${row.label}-${row.value}`}
                  className="avl-row avl-ink"
                  style={{
                    margin: 0,
                    padding: "8px 0",
                    borderBottom: `1px solid ${line}`,
                    fontSize: "14px",
                    color: ink,
                  }}
                >
                  <span className="avl-soft" style={{ color: inkSoft }}>
                    {row.label}:{" "}
                  </span>
                  {row.href ? (
                    <Link href={row.href} style={{ color: ink, textDecoration: "underline" }}>
                      {row.value}
                    </Link>
                  ) : (
                    row.value
                  )}
                </Text>
              ))}
            </Section>
          ) : null}

          {children}

          {primaryCta?.url ? (
            <Section style={{ margin: "24px 0 12px" }}>
              <Button
                className="avl-cta"
                href={primaryCta.url}
                data-avl-block={/view ticket/i.test(primaryCta.label) ? "ticket_url" : undefined}
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
                {primaryCta.label}
              </Button>
            </Section>
          ) : null}

          {(googleCalendarUrl || icsUrl) && (
            <Text
              className="avl-soft"
              style={{ margin: "8px 0 0", fontSize: "13px", color: inkSoft }}
            >
              Add to calendar:{" "}
              {googleCalendarUrl ? (
                <Link href={googleCalendarUrl} style={{ color: ink }}>
                  Google Calendar
                </Link>
              ) : null}
              {googleCalendarUrl && icsUrl ? " · " : null}
              {icsUrl ? (
                <Link href={icsUrl} style={{ color: ink }}>
                  Apple / Outlook (.ics)
                </Link>
              ) : null}
            </Text>
          )}

          <Hr style={{ borderColor: line, margin: "28px 0 16px" }} />
          {replyTo ? (
            <Text
              className="avl-soft"
              style={{ margin: "0 0 4px", fontSize: "12px", color: inkSoft }}
            >
              Reply to {replyTo}
            </Text>
          ) : null}
          <Text className="avl-soft" style={{ margin: 0, fontSize: "11px", color: inkSoft }}>
            Sent via Avoeline
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function AttendeeBodyText({ children }: { children: ReactNode }) {
  return (
    <Text
      className="avl-soft"
      style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: "1.6", color: inkSoft }}
    >
      {children}
    </Text>
  );
}
