import { NextResponse } from "next/server";
import { evolinkGetTask } from "@/lib/evolink";

// 把各种可能的结果字段统一解析成 imageUrls: string[]
function normalizeToStringArray(value: any): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string") as string[];
  }
  return [];
}

function extractImageUrlsFromObject(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  let urls: string[] = [];

  // 1) results (string[])
  if (obj.results) {
    urls = normalizeToStringArray(obj.results);
    if (urls.length) return urls;
  }

  // 2) result (string or string[])
  if (obj.result) {
    urls = normalizeToStringArray(obj.result);
    if (urls.length) return urls;
  }

  // 3) output.images[].url / images[].url
  if (obj.output && Array.isArray(obj.output.images)) {
    urls = obj.output.images
      .map((img: any) => img && img.url)
      .filter((u: any) => typeof u === "string");
    if (urls.length) return urls;
  }
  if (Array.isArray(obj.images)) {
    urls = obj.images
      .map((img: any) => img && img.url)
      .filter((u: any) => typeof u === "string");
    if (urls.length) return urls;
  }

  // 4) data[].url / artifacts[].url / files[].url / attachments[].url
  const collections = [
    obj.data,
    obj.artifacts,
    obj.files,
    obj.attachments,
  ];

  for (const col of collections) {
    if (Array.isArray(col)) {
      const colUrls = col
        .map((item: any) => item && item.url)
        .filter((u: any) => typeof u === "string");
      if (colUrls.length) return colUrls;
    }
  }

  return [];
}

export async function GET(_req: Request, context: any) {
  try {
    const id = (context && context.params && context.params.id) || "";

    // raw 是 Evolink 的原始返回
    const raw = await evolinkGetTask(id);

    // 从 raw 中尽量挑出当前 task（用于 status/进度显示）
    let task: any = raw;
    if (raw && Array.isArray((raw as any).data)) {
      const list = (raw as any).data as any[];
      const found =
        list.find((t) => t && t.id === id) ||
        list[0];
      if (found) {
        task = found;
      }
    }

    // 根据你要求的解析优先级，从 task 和 raw 里统一抽出 imageUrls
    let imageUrls: string[] = [];

    // 先从 task 自身尝试
    imageUrls = extractImageUrlsFromObject(task);

    // 如果 task 里没有，再从 raw 顶层尝试
    if (!imageUrls.length) {
      imageUrls = extractImageUrlsFromObject(raw);
    }

    // 如果 raw 是列表结构，再从 raw.data[*] 里尝试
    if (!imageUrls.length && raw && Array.isArray((raw as any).data)) {
      const list = (raw as any).data as any[];
      for (const item of list) {
        const urlsFromItem = extractImageUrlsFromObject(item);
        if (urlsFromItem.length) {
          imageUrls = urlsFromItem;
          break;
        }
      }
    }

    return NextResponse.json({
      task,
      raw,
      imageUrls, // 统一的图片 URL 列表，前端只用 imageUrls[0] 即可
    });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}