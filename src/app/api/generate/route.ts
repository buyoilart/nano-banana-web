import { NextRequest, NextResponse } from "next/server";
import {
  EvolinkModel,
  EvolinkQuality,
  UiRatio,
  evolinkCreateTaskWithFallback,
} from "@/lib/evolink";
import {
  buildBaseArtworkPrompt,
  buildHeroLifestylePrompt,
  buildCleanArtworkViewPrompt,
  buildBedroomScenePrompt,
  buildTextureMacroPrompt,
  buildFramePresentationPrompt,
} from "@/lib/shots";

type Mode = "single" | "pack_base" | "pack_shot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: Mode = body.mode;

    if (mode === "single") {
      const {
        model,
        ratio,
        prompt,
        quality = "2K",
      } = body as {
        model: EvolinkModel;
        ratio: UiRatio;
        prompt: string;
        quality?: EvolinkQuality;
      };

      const finalPrompt = buildHeroLifestylePrompt(prompt, ratio);

      const task = await evolinkCreateTaskWithFallback({
        model,
        prompt: finalPrompt,
        uiRatio: ratio,
        quality,
        n: 1,
      });

      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        meta: task.meta,
        prompt: finalPrompt,
        raw: task,
      });
    }

    if (mode === "pack_base") {
      const {
        model,
        ratio,
        prompt,
        quality = "2K",
      } = body as {
        model: EvolinkModel;
        ratio: UiRatio;
        prompt: string;
        quality?: EvolinkQuality;
      };

      const finalPrompt = buildBaseArtworkPrompt(prompt);

      const task = await evolinkCreateTaskWithFallback({
        model,
        prompt: finalPrompt,
        uiRatio: ratio,
        quality,
        n: 1,
      });

      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        meta: task.meta,
        prompt: finalPrompt,
        raw: task,
      });
    }

    if (mode === "pack_shot") {
      const {
        model,
        ratio,
        userPrompt,
        quality = "2K",
        baseImageUrl,
        shotIndex,
      } = body as {
        model: EvolinkModel;
        ratio: UiRatio;
        userPrompt: string;
        quality?: EvolinkQuality;
        baseImageUrl?: string;
        shotIndex: number;
      };

      let finalPrompt: string;
      if (shotIndex === 1) {
        finalPrompt = buildHeroLifestylePrompt(userPrompt, ratio);
      } else if (shotIndex === 2) {
        finalPrompt = buildCleanArtworkViewPrompt(userPrompt, ratio);
      } else if (shotIndex === 3) {
        finalPrompt = buildBedroomScenePrompt(userPrompt, ratio);
      } else if (shotIndex === 4) {
        finalPrompt = buildTextureMacroPrompt();
      } else if (shotIndex === 5) {
        finalPrompt = buildFramePresentationPrompt(userPrompt, ratio);
      } else {
        return new NextResponse("Invalid shotIndex", { status: 400 });
      }

      const task = await evolinkCreateTaskWithFallback({
        model,
        prompt: finalPrompt,
        uiRatio: ratio,
        quality,
        n: 1,
        image_urls: baseImageUrl ? [baseImageUrl] : undefined,
      });

      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        meta: task.meta,
        prompt: finalPrompt,
        shotIndex,
        raw: task,
      });
    }

    return new NextResponse("Unsupported mode", { status: 400 });
  } catch (e: any) {
    console.error(e);
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
