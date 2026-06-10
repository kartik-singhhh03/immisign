// @ts-nocheck
import crypto from "crypto";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markWebhookEventProcessed, recordWebhookEvent } from "@/lib/integrations/webhook-events";
import { updateEmailDeliveryByResendId } from "@/lib/email/delivery-audit";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const supabase = createAdminClient();
  if (!webhookSecret) {
    console.error("Missing Resend Webhook Secret");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const rawBody = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Error occurred -- no svix headers" },
      { status: 400 }
    );
  }

  const wh = new Webhook(webhookSecret);
  let evt: any;

  try {
    evt = wh.verify(rawBody, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json({ error: "Error verifying" }, { status: 400 });
  }

  const { type, data } = evt;
  const emailId = data.email_id;

  const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");

  const webhookEventId = await recordWebhookEvent(supabase, {
    provider: 'resend',
    eventType: type,
    externalId: emailId,
    payload: data,
    payloadHash,
    status: 'received',
  });

  try {
    // Record the event
    await supabase.from("email_events").insert({
      resend_id: emailId,
      event_type: type,
      payload: data,
    });

    // Update job status if applicable
    if (type === "email.delivered" || type === "email.bounced" || type === "email.complained") {
      let status = "sent";
      if (type === "email.bounced" || type === "email.complained") {
        status = "failed";
      }

      await supabase
        .from("email_jobs")
        .update({ status: status as any, updated_at: new Date().toISOString() })
        .eq("resend_id", emailId);
    }

    if (type === "email.delivered" && emailId) {
      await updateEmailDeliveryByResendId(emailId, {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
      });
    } else if ((type === "email.bounced" || type === "email.complained") && emailId) {
      await updateEmailDeliveryByResendId(emailId, {
        status: type === "email.bounced" ? "bounced" : "failed",
        error: type,
      });
    } else if (type === "email.sent" && emailId) {
      await updateEmailDeliveryByResendId(emailId, { status: "sent" });
    }

    if (webhookEventId) {
      await markWebhookEventProcessed(supabase, webhookEventId, 'processed');
    }
    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("Error processing resend webhook payload:", err);
    if (webhookEventId) {
      const msg = err instanceof Error ? err.message : 'Webhook processing failed';
      await markWebhookEventProcessed(supabase, webhookEventId, 'failed', msg);
    }
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

