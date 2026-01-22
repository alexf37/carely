import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type FollowUpEmailProps = {
  patientName: string;
  followUpReason: string;
  followUpDate: string;
  additionalNotes?: string;
  appointmentId?: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://carely.alexfoster.dev";

export function FollowUpEmail({
  patientName,
  followUpReason,
  followUpDate,
  additionalNotes,
  appointmentId,
}: FollowUpEmailProps) {
  const appointmentUrl = appointmentId ? `${BASE_URL}/appointment/${appointmentId}` : null;
  return (
    <Html>
      <Head />
      <Preview>Follow-up reminder from Carely</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Follow-Up Reminder</Heading>

          <Text style={greeting}>Hi {patientName},</Text>

          <Text style={paragraph}>
            This is a reminder about your follow-up care from your recent visit with Carely.
          </Text>

          <Section style={infoSection}>
            <Text style={label}>Reason for Follow-Up</Text>
            <Text style={value}>{followUpReason}</Text>
          </Section>

          <Section style={infoSection}>
            <Text style={label}>Recommended Date</Text>
            <Text style={value}>{followUpDate}</Text>
          </Section>

          {additionalNotes && (
            <Section style={infoSection}>
              <Text style={label}>Additional Notes</Text>
              <Text style={value}>{additionalNotes}</Text>
            </Section>
          )}

          {appointmentUrl && (
            <Section style={buttonSection}>
              <Link href={appointmentUrl} style={button}>
                View Your Appointment
              </Link>
            </Section>
          )}

          <Text style={paragraph}>
            If you have any questions or need to discuss your care further, please don't hesitate to continue your conversation with Carely.
          </Text>

          <Text style={footer}>
            — Carely, Your Primary Care Assistant
          </Text>

          <Text style={disclaimer}>
            This is an automated reminder. The information provided by Carely is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const heading = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "0 0 24px",
};

const greeting = {
  color: "#0f172a",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 16px",
};

const paragraph = {
  color: "#475569",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

const infoSection = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "16px",
};

const label = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "500",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 4px",
};

const value = {
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "500",
  margin: "0",
  lineHeight: "1.5",
};

const footer = {
  color: "#0f172a",
  fontSize: "15px",
  lineHeight: "1.5",
  margin: "24px 0 0",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const disclaimer = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "32px 0 0",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "16px",
};

export default FollowUpEmail;
