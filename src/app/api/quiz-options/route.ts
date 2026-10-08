import { NextResponse } from "next/server";
import { getQuizOptions } from "@/lib/quiz-options";

export const revalidate = 3600; // ISR: revalidate every hour

export async function GET() {
  const options = await getQuizOptions();
  return NextResponse.json(options);
}
