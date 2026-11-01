import { TransactionalEmail, BodyText } from "./layout";

export type PlatformInvoiceSummaryEmailProps = {
  name?: string;
  planName: string;
  periodLabel?: string;
  amountLabel?: string;
  notes?: string | null;
};

export function PlatformInvoiceSummaryEmail({
  name,
  planName,
  periodLabel,
  amountLabel,
  notes,
}: PlatformInvoiceSummaryEmailProps) {
  return (
    <TransactionalEmail preview={`Billing summary — ${planName}`} heading="Billing summary">
      {name ? <BodyText>Hello {name},</BodyText> : null}
      <BodyText>
        Here is a summary of your Avoeline plan billing (not a payment-processor PDF).
      </BodyText>
      <BodyText>
        Plan: <strong>{planName}</strong>
        {periodLabel ? (
          <>
            <br />
            Period: {periodLabel}
          </>
        ) : null}
        {amountLabel ? (
          <>
            <br />
            Amount: {amountLabel}
          </>
        ) : null}
      </BodyText>
      {notes ? <BodyText>{notes}</BodyText> : null}
    </TransactionalEmail>
  );
}

export default PlatformInvoiceSummaryEmail;
