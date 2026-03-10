"use client";

import React from "react";
import { SHOT_LABELS } from "@/lib/shots";

type ModelOption =
  | "nano-banana-2-lite"
  | "gpt-image-1.5"
  | "z-image-turbo"
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image";

type UiRatio = "1:1" | "1:2" | "3:4";
type Quality = "0.5K" | "1K" | "2K" | "4K";

const MODELS: { value: ModelOption; label: string }[] = [
  { value: "nano-banana-2-lite", label: "nano-banana-2-lite (默认)" },
  { value: "gpt-image-1.5", label: "gpt-image-1.5" },
  { value: "z-image-turbo", label: "z-image-turbo" },
  { value: "gemini-2.5-flash-image", label: "gemini-2.5-flash-image" },
  { value: "gemini-3-pro-image", label: "gemini-3-pro-image" },
];

interface PollState {
  status: string | null;
  results: string[];
  debug: any;
  timeoutReached: boolean;
}

function usePolling(taskId: string | null) {
  const [state, setState] = React.useState<PollState>({
    status: null,
    results: [],
    debug: null,
    timeoutReached: false,
  });

  React.useEffect(() => {
    if (!taskId) {
      setState({ status: null, results: [], debug: null, timeoutReached: false });
      return;
    }

    let cancelled = false;
    let elapsed = 0;
    const MAX = 120_000;
    const INTERVAL = 2500;

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/task/${taskId}`);
        if (!res.ok) {
          const text = await res.text();
          setState((prev) => ({
            ...prev,
            status: "failed",
            debug: { error: text },
          }));
          return;
        }
        const data = await res.json();
        const task = data.task;
        const status = task.status as string;
        const results = (task.results || []) as string[];

        setState((prev) => ({
          ...prev,
          status,
          results,
          debug: task,
        }));

        if (status === "completed") return;

        elapsed += INTERVAL;
        if (elapsed >= MAX) {
          setState((prev) => ({ ...prev, timeoutReached: true }));
          return;
        }

        setTimeout(poll, INTERVAL);
      } catch (e: any) {
        setState((prev) => ({
          ...prev,
          status: "failed",
          debug: { error: String(e?.message ?? e) },
        }));
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  return state;
}

export default function HomePage() {
  // Single
  const [activeTab, setActiveTab] = React.useState<
    "single" | "pack" | "competitor" | "batch"
  >("single");
  const [singleModel, setSingleModel] =
    React.useState<ModelOption>("nano-banana-2-lite");
  const [singleRatio, setSingleRatio] = React.useState<UiRatio>("1:1");
  const [singleQuality, setSingleQuality] =
    React.useState<Quality>("2K");
  const [singlePrompt, setSinglePrompt] = React.useState("");
  const [singleTaskId, setSingleTaskId] = React.useState<string | null>(null);
  const [singleMeta, setSingleMeta] = React.useState<any | null>(null);
  const [singlePromptSent, setSinglePromptSent] = React.useState<string | null>(
    null
  );
  const [singleError, setSingleError] = React.useState<string | null>(null);

  const singlePolling = usePolling(singleTaskId);

  async function handleSingleGenerate() {
    setSingleError(null);
    setSingleTaskId(null);
    setSingleMeta(null);
    setSinglePromptSent(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          mode: "single",
          model: singleModel,
          ratio: singleRatio,
          prompt: singlePrompt,
          quality: singleQuality,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setSingleError(text);
        return;
      }
      const data = await res.json();
      setSingleTaskId(data.taskId);
      setSingleMeta(data.meta);
      setSinglePromptSent(data.prompt);
    } catch (e: any) {
      setSingleError(String(e?.message ?? e));
    }
  }

  // Pack
  const [packModel, setPackModel] =
    React.useState<ModelOption>("nano-banana-2-lite");
  const [packRatio, setPackRatio] = React.useState<UiRatio>("3:4");
  const [packQuality, setPackQuality] =
    React.useState<Quality>("2K");
  const [packPrompt, setPackPrompt] = React.useState("");
  const [packError, setPackError] = React.useState<string | null>(null);

  const [baseTaskId, setBaseTaskId] = React.useState<string | null>(null);
  const basePolling = usePolling(baseTaskId);
  const [baseMeta, setBaseMeta] = React.useState<any | null>(null);
  const [basePromptSent, setBasePromptSent] = React.useState<string | null>(null);

  const [baseImageUrl, setBaseImageUrl] = React.useState<string | null>(null);

  type ShotState = {
    taskId?: string;
    status?: string;
    imageUrl?: string;
    meta?: any;
    prompt?: string;
  };

  const [shots, setShots] = React.useState<ShotState[]>(Array(6).fill({}));

  // 简单包装 setInterval，返回 id，方便 clear
  function setIntervalAsync(fn: () => void, t: number) {
    const id = setInterval(fn, t);
    return id;
  }

  async function handleGeneratePack() {
    setPackError(null);
    setBaseTaskId(null);
    setBaseMeta(null);
    setBasePromptSent(null);
    setBaseImageUrl(null);
    setShots(Array(6).fill({}));

    try {
      // 1) base artwork
      const res = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          mode: "pack_base",
          model: packModel,
          ratio: packRatio,
          prompt: packPrompt,
          quality: packQuality,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setPackError(text);
        return;
      }
      const data = await res.json();
      setBaseTaskId(data.taskId);
      setBaseMeta(data.meta);
      setBasePromptSent(data.prompt);

      const intervalId = setIntervalAsync(async () => {
        if (!data.taskId) return;
        const r = await fetch(`/api/task/${data.taskId}`);
        if (!r.ok) {
          const text = await r.text();
          setPackError(text);
          clearInterval(intervalId);
          return;
        }
        const j = await r.json();
        const task = j.task;
        if (task.status === "completed") {
          clearInterval(intervalId);
          const url = (task.results || [])[0] as string | undefined;
          if (!url) return;
          setBaseImageUrl(url);
          setShots((prev) => {
            const next = [...prev];
            next[0] = {
              taskId: data.taskId,
              status: task.status,
              imageUrl: url,
              meta: data.meta,
              prompt: data.prompt,
            };
            return next;
          });

          // 2) shots 1..5
          const shotIndices = [1, 2, 3, 4, 5];
          const promises = shotIndices.map(async (idx) => {
            const res2 = await fetch("/api/generate", {
              method: "POST",
              body: JSON.stringify({
                mode: "pack_shot",
                model: packModel,
                ratio: packRatio,
                userPrompt: packPrompt,
                quality: packQuality,
                baseImageUrl: url,
                shotIndex: idx,
              }),
            });
            if (!res2.ok) {
              const text = await res2.text();
              throw new Error(text);
            }
            const d2 = await res2.json();
            return { idx, ...d2 };
          });

          try {
            const created = await Promise.all(promises);
            setShots((prev) => {
              const next = [...prev];
              for (const c of created) {
                next[c.idx] = {
                  ...next[c.idx],
                  taskId: c.taskId,
                  meta: c.meta,
                  prompt: c.prompt,
                };
              }
              return next;
            });

            created.forEach((c) => {
              const shotId = c.taskId as string;
              const idx = c.idx as number;
              let stopped = false;
              const pollShot = async () => {
                if (stopped) return;
                const r2 = await fetch(`/api/task/${shotId}`);
                if (!r2.ok) {
                  const text = await r2.text();
                  setPackError(text);
                  stopped = true;
                  return;
                }
                const j2 = await r2.json();
                const t2 = j2.task;
                const status = t2.status as string;
                const url2 = (t2.results || [])[0] as string | undefined;

                setShots((prev) => {
                  const next = [...prev];
                  next[idx] = {
                    ...next[idx],
                    status,
                    imageUrl: url2 ?? next[idx].imageUrl,
                  };
                  return next;
                });

                if (status === "completed") return;
                setTimeout(pollShot, 2500);
              };
              pollShot();
            });
          } catch (e: any) {
            setPackError(String(e?.message ?? e));
          }
        }
      }, 2500);
    } catch (e: any) {
      setPackError(String(e?.message ?? e));
    }
  }

return (
    <main className="min-h-screen bg-[#050510] text-white">
      {/* 顶部导航 / 标题 */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Nano Banana 2 Web Generator
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Single & Pack (5 shots) for Etsy oil painting sellers. Competitor &
            Batch coming soon.
          </p>
        </div>
        <div className="text-[11px] text-white/50">
          Powered by Evolink API · Next.js + TypeScript
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="px-6 py-4 max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 text-xs border-b border-white/10 mb-4">
          <button
            className={`px-3 py-1 rounded-t ${
              activeTab === "single"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
            onClick={() => setActiveTab("single")}
          >
            Single
          </button>
          <button
            className={`px-3 py-1 rounded-t ${
              activeTab === "pack"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
            onClick={() => setActiveTab("pack")}
          >
            Pack (5 shots)
          </button>
          <button
            className="px-3 py-1 rounded-t text-white/30 cursor-not-allowed"
            type="button"
          >
            Competitor (Etsy URL) · Coming soon
          </button>
          <button
            className="px-3 py-1 rounded-t text-white/30 cursor-not-allowed"
            type="button"
          >
            Batch · Coming soon
          </button>
        </div>

        {/* 两列布局 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 左侧：控制面板 */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            {activeTab === "single" && (
              <>
                <h2 className="font-semibold text-sm mb-1">
                  Single Generate（单张）
                </h2>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Model</label>
                    <select
                      value={singleModel}
                      onChange={(e) =>
                        setSingleModel(e.target.value as ModelOption)
                      }
                      className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs"
                    >
                      {MODELS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Ratio</label>
                    <select
                      value={singleRatio}
                      onChange={(e) =>
                        setSingleRatio(e.target.value as UiRatio)
                      }
                      className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs"
                    >
                      <option value="1:1">1:1</option>
                      <option value="1:2">1:2</option>
                      <option value="3:4">3:4</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Quality</label>
                    <select
                      value={singleQuality}
                      onChange={(e) =>
                        setSingleQuality(e.target.value as Quality)
                      }
                      className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs"
                    >
                      <option value="0.5K">0.5K</option>
                      <option value="1K">1K</option>
                      <option value="2K">2K</option>
                      <option value="4K">4K</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">Prompt</label>
                  <textarea
                    value={singlePrompt}
                    onChange={(e) => setSinglePrompt(e.target.value)}
                    rows={4}
                    className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs w-full"
                    placeholder="e.g. abstract neutral impasto oil painting"
                  />
                </div>

                <button
                  onClick={handleSingleGenerate}
                  className="bg-white text-black px-4 py-1.5 rounded text-xs font-medium"
                >
                  Generate
                </button>

                {singleError && (
                  <div className="text-[11px] text-red-400 whitespace-pre-wrap">
                    {singleError}
                  </div>
                )}
              </>
            )}

            {activeTab === "pack" && (
              <>
                <h2 className="font-semibold text-sm mb-1">
                  Pack Generate（1 Base + 5 Shots）
                </h2>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Model</label>
                    <select
                      value={packModel}
                      onChange={(e) =>
                        setPackModel(e.target.value as ModelOption)
                      }
                      className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs"
                    >
                      {MODELS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Ratio</label>
                    <select
                      value={packRatio}
                      onChange={(e) =>
                        setPackRatio(e.target.value as UiRatio)
                      }
                      className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs"
                    >
                      <option value="1:1">1:1</option>
                      <option value="1:2">1:2</option>
                      <option value="3:4">3:4</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium">Quality</label>
                    <select
                      value={packQuality}
                      onChange={(e) =>
                        setPackQuality(e.target.value as Quality)
                      }
                      className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs"
                    >
                      <option value="0.5K">0.5K</option>
                      <option value="1K">1K</option>
                      <option value="2K">2K</option>
                      <option value="4K">4K</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium">
                    Base Prompt（画芯主题）
                  </label>
                  <textarea
                    value={packPrompt}
                    onChange={(e) => setPackPrompt(e.target.value)}
                    rows={4}
                    className="border border-white/20 bg-black/40 rounded px-2 py-1 text-xs w-full"
                    placeholder="e.g. abstract neutral impasto oil painting"
                  />
                </div>

                <button
                  onClick={handleGeneratePack}
                  className="bg-white text-black px-4 py-1.5 rounded text-xs font-medium"
                >
                  Generate Pack (1 base + 5 shots)
                </button>

                {packError && (
                  <div className="text-[11px] text-red-400 whitespace-pre-wrap">
                    {packError}
                  </div>
                )}
              </>
            )}

            {activeTab === "competitor" && (
              <div className="text-xs text-white/60">
                Competitor (Etsy URL) mode will be implemented in Phase 2.
              </div>
            )}

            {activeTab === "batch" && (
              <div className="text-xs text-white/60">
                Batch mode will be implemented in Phase 2.
              </div>
            )}
          </div>

          {/* 右侧：结果预览 / Debug */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
            {activeTab === "single" && (
              <>
                <div className="text-xs font-semibold mb-1">
                  Single Results
                </div>
                <div className="text-[11px] space-y-1">
                  <div>task_id: {singleTaskId || "-"}</div>
                  <div>Status: {singlePolling.status || "idle"}</div>
                  {singleMeta && (
                    <div className="text-white/60">
                      Requested ratio: {singleMeta.requestedRatio} · Requested
                      size: {singleMeta.requestedSize} · Actual size:{" "}
                      {singleMeta.finalSize}
                    </div>
                  )}
                  {singlePolling.timeoutReached && singleTaskId && (
                    <button
                      onClick={() => setSingleTaskId(singleTaskId)}
                      className="text-[11px] text-blue-300 underline"
                    >
                      继续轮询
                    </button>
                  )}
                </div>

                <div className="flex gap-4 flex-wrap mt-2">
                  {singlePolling.results.map((url) => (
                    <div
                      key={url}
                      className="flex flex-col items-center gap-1"
                    >
                      <img src={url} alt="" className="max-w-xs border" />
                      <a
                        href={url}
                        download
                        className="text-blue-300 underline text-[11px]"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-white/70">
                    Debug
                  </summary>
                  <pre className="text-[10px] whitespace-pre-wrap border border-white/10 mt-1 p-2 max-h-64 overflow-auto bg-black/40 rounded">
                    {JSON.stringify(
                      {
                        task_id: singleTaskId,
                        status: singlePolling.status,
                        raw: singlePolling.debug,
                        prompt: singlePromptSent,
                      },
                      null,
                      2
                    )}
                  </pre>
                </details>
              </>
            )}

            {activeTab === "pack" && (
              <>
                <div className="text-xs font-semibold mb-1">
                  Pack Results (1 base + 5 shots)
                </div>

                <div className="text-[11px] space-y-1">
                  <div>Base task_id: {baseTaskId || "-"}</div>
                  <div>Status: {basePolling.status || "idle"}</div>
                  {baseMeta && (
                    <div className="text-white/60">
                      Requested ratio: {baseMeta.requestedRatio} · Requested
                      size: {baseMeta.requestedSize} · Actual size:{" "}
                      {baseMeta.finalSize}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 flex-wrap mt-2">
                  {basePolling.results.map((url) => (
                    <div
                      key={url}
                      className="flex flex-col items-center gap-1"
                    >
                      <img src={url} alt="" className="max-w-xs border" />
                      <a
                        href={url}
                        download
                        className="text-blue-300 underline text-[11px]"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-[11px] font-semibold">
                  5 Shots（1–5）：同一幅画贯穿
                </div>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mt-2 text-[11px]">
                  {shots.map((shot, idx) => (
                    <div key={idx} className="border border-white/10 rounded p-2 space-y-1 bg-black/40">
                      <div className="font-semibold">
                        {SHOT_LABELS[idx] ?? `Shot ${idx}`}
                      </div>
                      <div>task_id: {shot.taskId || "-"}</div>
                      <div>Status: {shot.status || "waiting"}</div>
                      {shot.meta && (
                        <div className="text-[10px] text-white/60">
                          Requested ratio: {shot.meta.requestedRatio} ·
                          Requested size: {shot.meta.requestedSize} · Actual
                          size: {shot.meta.finalSize}
                        </div>
                      )}
                      {shot.imageUrl && (
                        <div className="space-y-1">
                          <img src={shot.imageUrl} alt="" className="w-full border" />
                          <a
                            href={shot.imageUrl}
                            download
                            className="text-blue-300 underline"
                          >
                            Download
                          </a>
                        </div>
                      )}
                      {shot.prompt && (
                        <details className="mt-1">
                          <summary>Prompt</summary>
                          <pre className="whitespace-pre-wrap mt-1 text-[10px]">
                            {shot.prompt}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {(activeTab === "competitor" || activeTab === "batch") && (
              <div className="text-xs text-white/60">
                This mode is not implemented yet. It will be added in Phase 2.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
