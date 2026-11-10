"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { pushClip, workspaceId } from "@/lib/sync";

type Clip = { url: string; title: string; text: string };

let started = false;

function saveLocally(item: Clip) {
  const inbox = JSON.parse(localStorage.getItem("subtext.inbox") || "[]");
  localStorage.setItem("subtext.inbox", JSON.stringify([...inbox, item]));
}

export default function Capture() {
  const [clip, setClip] = useState<Clip | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!window.location.hash) {
      if (!started) setProblem("Nothing to save. Use the bookmarklet or extension from a page you're reading.");
      return;
    }
    started = true;
    let item: Clip;
    try {
      const data = JSON.parse(decodeURIComponent(window.location.hash.slice(1))) as Clip;
      if (!data?.url) throw new Error();
      item = { url: String(data.url), title: String(data.title || data.url).slice(0, 200), text: String(data.text || "").slice(0, 24000) };
    } catch {
      setProblem("Nothing to save. Use the bookmarklet or extension from a page you're reading.");
      return;
    }
    history.replaceState(null, "", "/capture");

    pushClip(workspaceId(), item)
      .then((res) => {
        if (!res.enabled || !res.ok) saveLocally(item);
      })
      .catch(() => saveLocally(item))
      .finally(() => {
        setClip(item);
        if (window.opener) setTimeout(() => window.close(), 1800);
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="fade-in w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {clip ? (
          <>
            <p className="text-[17px] font-medium">Saved to your sources</p>
            <p className="mt-2 line-clamp-2 text-[14px] text-soft">{clip.title}</p>
            <p className="mt-1 text-[12px] text-faint">{(clip.text.match(/\S+/g) ?? []).length.toLocaleString()} words clipped</p>
          </>
        ) : (
          <p className="text-[14px] text-soft">{problem || "Saving…"}</p>
        )}
        <a href="/" className="mt-6 inline-block text-[13px] text-link hover:underline">Open Subtext</a>
      </div>
    </main>
  );
}
