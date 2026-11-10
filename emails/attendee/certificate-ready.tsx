import React from "react";
import { Button, Section, Text } from "@react-email/components";
import { AttendeeBodyText, AttendeeEmailLayout } from "./AttendeeEmailLayout";
import type { CertificateReadyProps } from "@/src/features/email/attendeeEmail.model";

export function CertificateReadyEmail(props: CertificateReadyProps) {
  return (
    <AttendeeEmailLayout
      preview={props.preview}
      organizerName={props.organizerName}
      bannerUrl={props.bannerUrl}
      title={props.title}
      statusLabel={props.statusLabel || "Certificate ready"}
      details={[
        { label: "Event", value: props.eventTitle },
        { label: "Awarded as", value: props.role },
        { label: "Issued", value: props.issued },
        { label: "Verification code", value: props.verificationCode },
        ...props.details,
      ]}
      primaryCta={{ label: "View certificate", url: props.viewerUrl }}
      replyTo={props.replyTo}
    >
      <AttendeeBodyText>
        Hi {props.recipientName}, your certificate for {props.eventTitle} has been issued.
      </AttendeeBodyText>
      {props.driveShareUrl ? (
        <Section style={{ margin: "12px 0" }}>
          <Button
            href={props.driveShareUrl}
            style={{
              display: "inline-block",
              padding: "10px 16px",
              backgroundColor: "#f5f5f5",
              color: "#171717",
              textDecoration: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              border: "1px solid #e5e5e5",
            }}
          >
            Open Drive copy
          </Button>
        </Section>
      ) : null}
      <Section style={{ margin: "8px 0" }}>
        <Button
          href={props.verifyUrl}
          style={{
            display: "inline-block",
            padding: "10px 16px",
            backgroundColor: "#f5f5f5",
            color: "#171717",
            textDecoration: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            border: "1px solid #e5e5e5",
          }}
        >
          Verify authenticity
        </Button>
      </Section>
      <Text style={{ margin: "12px 0 0", fontSize: "12px", color: "#737373" }}>
        Anyone with the verify link can confirm it is genuine.
      </Text>
    </AttendeeEmailLayout>
  );
}

export default CertificateReadyEmail;
