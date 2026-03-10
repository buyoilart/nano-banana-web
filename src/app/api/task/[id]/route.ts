import { NextResponse } from "next/server";
import { evolinkGetTask } from "@/lib/evolink";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id; // ✅ 正确拿到 task id
    const raw = await evolinkGetTask(id);

    const imageUrls: string[] = Array.isArray((raw as any).results)
      ? (raw as any).results.filter((u: any) => typeof u === "string")
      : [];

    return NextResponse.json({
      task_id: id,
      status: (raw as any).status,
      raw,
      imageUrls,
    });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
