cat << 'EOF' > "src/app/api/task/[id]/route.ts"
import { NextResponse } from "next/server";
import { evolinkGetTask } from "@/lib/evolink";

// 宽松类型的 Route Handler：避免 Next.js 在生产构建时的严格类型报错
export async function GET(
  _req: Request,
  context: any
) {
  try {
    const id = context?.params?.id as string;
    if (!id) {
      return new NextResponse("Missing task id", { status: 400 });
    }

    const task = await evolinkGetTask(id);
    return NextResponse.json({ task });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
EOF