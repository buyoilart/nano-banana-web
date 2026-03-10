import { NextResponse } from "next/server";
import { evolinkGetTask } from "@/lib/evolink";

// 适配 Evolink /tasks/{id} 返回的 data 列表结构：从中挑出当前 task
export async function GET(
  _req: Request,
  context: any
) {
  try {
    const id = (context && context.params && context.params.id) || "";

    // raw 是 Evolink 的原始返回
    const raw = await evolinkGetTask(id);

    let task: any = raw;

    // 如果是列表结构：{ data: [ { id, status, ... }, ... ], ... }
    if (raw && Array.isArray((raw as any).data)) {
      const list = (raw as any).data as any[];
      const found =
        list.find((t) => t && t.id === id) ||
        list[0]; // 找不到就退而求其次用第一个

      if (found) {
        task = found;
      }
    }

    // 返回结构：前端仍然用 data.task 读 status，但同时把 raw 也带回去方便 Debug
    return NextResponse.json({ task, raw });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}