import { NextRequest, NextResponse } from "next/server";
import { evolinkGetTask } from "@/lib/evolink";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await evolinkGetTask(params.id);
    return NextResponse.json({ task });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
