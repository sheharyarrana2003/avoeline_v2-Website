import type { ReactElement } from "react";
import { RegistrationConfirmedEmail } from "@/emails/registration-confirmed";
import { EventInviteEmail } from "@/emails/event-invite";
import { CertificateReadyEmail } from "@/emails/certificate-ready";
import { CategoryRequestDecidedEmail } from "@/emails/category-request-decided";
import { WaitlistPromotedEmail } from "@/emails/waitlist-promoted";
import { GenericNotificationEmail } from "@/emails/generic-notification";

export type NotificationEmailInput = {
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
};

function firstUrl(text: string): string | undefined {
  const match = text.match(/https?:\/\/[^\s<>"]+/i);
  return match?.[0]?.replace(/[).,;]+$/, "");
}

export function renderNotificationEmail({
  type,
  title,
  body,
  actionUrl,
}: NotificationEmailInput): ReactElement {
  const href = actionUrl || firstUrl(body);
  const eventTitle = title.includes(":") ? title.split(":").slice(1).join(":").trim() : undefined;

  switch (type) {
    case "registration_confirmed":
    case "registration_confirmation":
      return <RegistrationConfirmedEmail body={body} eventTitle={eventTitle} actionUrl={href} />;
    case "waitlist_promoted":
      return <WaitlistPromotedEmail body={body} eventTitle={eventTitle} actionUrl={href} />;
    case "invite_link_sent":
    case "event_invite":
      return <EventInviteEmail body={body} eventTitle={eventTitle} actionUrl={href} />;
    case "certificate_ready":
      return <CertificateReadyEmail body={body} eventTitle={eventTitle} actionUrl={href} />;
    case "category_approved":
      return <CategoryRequestDecidedEmail body={body} approved actionUrl={href} />;
    case "category_rejected":
      return <CategoryRequestDecidedEmail body={body} approved={false} actionUrl={href} />;
    default:
      return (
        <GenericNotificationEmail
          heading={title || "Notification from Avoeline"}
          body={body}
          actionUrl={href}
        />
      );
  }
}
