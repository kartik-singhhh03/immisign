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

    await emailService.dispatch(data.jobId);

    return NextResponse.json({ success: true, jobId: data.jobId });
  } catch (error) {
    console.error("[EMAIL_SEND_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
