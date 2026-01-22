import { sleep } from "workflow";
import { sendFollowUpEmail } from "@/email";

type FollowUpEmailWorkflowParams = {
  patientEmail: string;
  patientName: string;
  followUpReason: string;
  followUpDate: string;
  additionalNotes?: string;
  scheduledDateTime: string;
  appointmentId?: string;
};

export async function followUpEmailWorkflow({
  patientEmail,
  patientName,
  followUpReason,
  followUpDate,
  additionalNotes,
  scheduledDateTime,
  appointmentId,
}: FollowUpEmailWorkflowParams) {
  "use workflow";

  const scheduledAt = new Date(scheduledDateTime);
  const now = new Date();
  const delayMs = scheduledAt.getTime() - now.getTime();

  if (delayMs > 0) {
    await sleep(delayMs);
  }

  await sendEmail({
    patientEmail,
    patientName,
    followUpReason,
    followUpDate,
    additionalNotes,
    appointmentId,
  });

  return { success: true, sentAt: new Date().toISOString() };
}

async function sendEmail({
  patientEmail,
  patientName,
  followUpReason,
  followUpDate,
  additionalNotes,
  appointmentId,
}: Omit<FollowUpEmailWorkflowParams, "scheduledDateTime">) {
  "use step";

  await sendFollowUpEmail({
    to: patientEmail,
    patientName,
    followUpReason,
    followUpDate,
    additionalNotes,
    appointmentId,
  });

  return { sent: true };
}
