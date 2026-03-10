import { NextResponse } from "next/server";
import { evolinkGetTask } from "@/lib/evolink";

// 宽松类型 Route Handler：直接把 id 交给 Evolink 处理
export async function GET(
  _req: Request,
  context: any
) {
  try {
    const id = (context && context.params && context.params.id) || "";
    const task = await evolinkGetTask(id);
    return NextResponse.json({ task });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}