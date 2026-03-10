const BASE_URL = process.env.EVOLINK_BASE_URL ?? "https://api.evolink.ai/v1";
const API_KEY = process.env.EVOLINK_API_KEY;

if (!API_KEY) {
  throw new Error("Missing EVOLINK_API_KEY in env");
}

export type EvolinkModel =
  | "nano-banana-2-lite"
  | "gpt-image-1.5"
  | "z-image-turbo"
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image";

export type UiRatio = "1:1" | "1:2" | "3:4";
export type EvolinkSize = "1:1" | "3:4" | "1:2" | "2:3" | "9:16";
export type EvolinkQuality = "0.5K" | "1K" | "2K" | "4K";

export interface CreateTaskInternalPayload {
  model: EvolinkModel;
  prompt: string;
  uiRatio: UiRatio;
  quality?: EvolinkQuality;
  n?: number;
  image_urls?: string[];
}

export interface EvolinkTaskRaw {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  task_info?: { estimated_time?: number };
  [key: string]: any;
}

export interface CreateTaskResponseExtended extends EvolinkTaskRaw {
  meta: {
    requestedRatio: UiRatio;
    requestedSize: EvolinkSize;
    finalSize: EvolinkSize;
  };
}

export interface TaskResult extends EvolinkTaskRaw {}

function mapUiRatioToSize(ui: UiRatio): EvolinkSize {
  if (ui === "1:1") return "1:1";
  if (ui === "3:4") return "3:4";
  return "1:2";
}

function isSizeError(msg: string) {
  return /size|ratio|aspect/i.test(msg) && /unsupported|invalid/i.test(msg);
}

async function callCreate(
  size: EvolinkSize,
  base: Omit<CreateTaskInternalPayload, "uiRatio">
) {
  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: base.model,
      prompt: base.prompt,
      size,
      quality: base.quality ?? "2K",
      n: base.n ?? 1,
      image_urls: base.image_urls,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolink create error: ${res.status} ${text}`);
  }
  const json = (await res.json()) as EvolinkTaskRaw;
  return { json, size };
}

export async function evolinkCreateTaskWithFallback(
  body: CreateTaskInternalPayload
): Promise<CreateTaskResponseExtended> {
  const requestedSize = mapUiRatioToSize(body.uiRatio);
  const base = {
    model: body.model,
    prompt: body.prompt,
    quality: body.quality,
    n: body.n,
    image_urls: body.image_urls,
  };

  try {
    const { json, size } = await callCreate(requestedSize, base);
    return {
      ...json,
      meta: {
        requestedRatio: body.uiRatio,
        requestedSize,
        finalSize: size,
      },
    };
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (body.uiRatio !== "1:2" || !isSizeError(msg)) throw e;
  }

  try {
    const { json, size } = await callCreate("2:3", base);
    return {
      ...json,
      meta: {
        requestedRatio: body.uiRatio,
        requestedSize,
        finalSize: size,
      },
    };
  } catch (e2: any) {
    const msg2 = String(e2?.message ?? "");
    if (!isSizeError(msg2)) throw e2;
  }

  const { json, size } = await callCreate("9:16", base);
  return {
    ...json,
    meta: {
      requestedRatio: body.uiRatio,
      requestedSize,
      finalSize: size,
    },
  };
}

export async function evolinkGetTask(taskId: string): Promise<TaskResult> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolink task error: ${res.status} ${text}`);
  }
  return res.json();
}
