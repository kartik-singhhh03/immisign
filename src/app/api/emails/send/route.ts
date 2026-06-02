import { NextResponse } from "next/server";
import { emailService } from "@/lib/email/service";
import { z } from "zod";

const sendEmailSchema = z.object({
  jobId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = sendEmailSchema.parse(body);
    console.log('EMAIL_SEND_START', JSON.stringify({ jobId: data.jobId }));

    await emailService.dispatch(data.jobId);
    console.log('EMAIL_SEND_SUCCESS', JSON.stringify({ jobId: data.jobId }));

    return NextResponse.json({ success: true, jobId: data.jobId });
  } catch (error) {
    console.error('EMAIL_SEND_FAILED', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
