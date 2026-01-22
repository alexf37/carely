import { Resend } from "resend";
import { render } from "@react-email/components";
import { FollowUpEmail } from "./follow-up-email";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendFollowUpEmailParams = {
  to: string;
  patientName: string;
  followUpReason: string;
  followUpDate: string;
  additionalNotes?: string;
  scheduledAt?: Date;
  appointmentId?: string;
};

export async function sendFollowUpEmail({
  to,
  patientName,
  followUpReason,
  followUpDate,
  additionalNotes,
  scheduledAt,
  appointmentId,
}: SendFollowUpEmailParams) {
  console.log("Sending follow-up email to", to, "for", patientName, "with reason", followUpReason, "and date", followUpDate, "and additional notes", additionalNotes, "and scheduled at", scheduledAt, "and appointment", appointmentId);
  const result = await resend.emails.send({
    from: "Carely <carely@jobwatch-noreply.alexfoster.dev>",
    to,
    subject: `Follow-Up Reminder: ${followUpReason}`,
    react: FollowUpEmail({
      patientName,
      followUpReason,
      followUpDate,
      additionalNotes,
      appointmentId,
    }),
    ...(scheduledAt && { scheduledAt: scheduledAt.toISOString() }),
  });

  return result;
}
