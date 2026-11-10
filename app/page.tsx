"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EditorPanel from "@/components/EditorPanel";
import ProductNote from "@/components/ProductNote";
import ResearchPanel, { extractSource, newSource } from "@/components/ResearchPanel";
import { Button, Logo, Segmented, Sheet } from "@/components/ui";
import { sampleDesk } from "@/lib/sample";
import { dropDesk, mergeDesks, pullClips, pullDesks, pushDesk, switchWorkspace, workspaceId, type SyncState } from "@/lib/sync";
import type { Angle, Desk, Source } from "@/lib/types";

const DESKS = "subtext.desks";
const ACTIVE = "subtext.active";
const INBOX = "subtext.inbox";

type View = "research" | "split" | "write";

const blankDesk = (n: number): Desk => ({
  id: Math.random().toString(36).slice(2, 10),
  name: `Untitled issue ${n}`,
  sources: [],
  original: "",
  draft: "",
  editorNotes: [],
  dismissed: [],
  updatedAt: Date.now(),
});

export default function Home() {
  const [desks, setDesks] = useState<Desk[]>([]);
  const [activeId, setActiveId] = useState("");
  const [view, setView] = useState<View>("research");
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<"note" | "clipper" | null>(null);
  const [menu, setMenu] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [sync, setSync] = useState<SyncState>("local");
  const [syncError, setSyncError] = useState("");
  const activeRef = useRef(activeId);
  const workspace = useRef("");
  const cloud = useRef(false);
  const synced = useRef(new Map<string, number>());
  activeRef.current = activeId;

  useEffect(() => {
    let saved: Desk[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(DESKS) || "[]");
    } catch {}
    const list = saved.length ? saved : [sampleDesk];
    const id = localStorage.getItem(ACTIVE);
    setDesks(list);
    setActiveId(list.some((d) => d.id === id) ? id! : list[0].id);
    setWelcome(!localStorage.getItem("subtext.welcomed"));
    setReady(true);

    workspace.current = workspaceId();
    pullDesks(workspace.current)
      .then(({ enabled, desks: remote }) => {
        if (!enabled) return;
        cloud.current = true;
        remote.forEach((d) => synced.current.set(d.id, d.updatedAt));
        setDesks((local) => {
          const merged = mergeDesks(local, remote);
          setActiveId((cur) => (merged.some((d) => d.id === cur) ? cur : merged[0].id));
          return merged;
        });
        setSync("saved");
      })
      .catch((e: Error) => {
        setSync("error");
        setSyncError(e.message);
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(DESKS, JSON.stringify(desks));
      localStorage.setItem(ACTIVE, activeId);
    } catch {}
  }, [desks, activeId, ready]);

  useEffect(() => {
    if (!ready || !cloud.current) return;
    const dirty = desks.filter((d) => synced.current.get(d.id) !== d.updatedAt);
    if (!dirty.length) return;
    const timer = setTimeout(async () => {
      setSync("saving");
      try {
        await Promise.all(dirty.map((d) => pushDesk(workspace.current, d).then(() => synced.current.set(d.id, d.updatedAt))));
        setSync("saved");
        setSyncError("");
      } catch (e) {
        setSync("error");
        setSyncError(e instanceof Error ? e.message : "Sync failed.");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [desks, ready]);

  const update = useCallback((id: string, fn: (d: Desk) => Desk) => {
    setDesks((all) => all.map((d) => (d.id === id ? { ...fn(d), updatedAt: Date.now() } : d)));
  }, []);

  const ingest = useCallback(async () => {
    let items: { url: string; title: string; text: string }[] = [];
    try {
      items = JSON.parse(localStorage.getItem(INBOX) || "[]");
      localStorage.removeItem(INBOX);
    } catch {}
    if (cloud.current) {
      try {
        const { clips } = await pullClips(workspace.current);
        items = [...items, ...clips];
      } catch {}
    }
    if (!items.length) return;
    const target = activeRef.current;
    const fresh = items.map((it) => {
      const words = (it.text.match(/\S+/g) ?? []).length;
      let site = "";
      try {
        site = new URL(it.url).hostname.replace(/^www\./, "");
      } catch {}
      return newSource({ url: it.url, title: it.title || it.url, site, text: it.text, kind: /(^|\.)(x|twitter)\.com$/.test(site) ? "tweet" : "article", status: words >= 120 ? "ready" : "loading" });
    });
    update(target, (d) => ({ ...d, sources: [...d.sources, ...fresh.filter((f) => !d.sources.some((s) => s.url && s.url === f.url))] }));
    fresh
      .filter((s) => s.status === "loading")
      .forEach(async (s) => {
        const got = await extractSource({ url: s.url });
        const better = (got.text?.length ?? 0) > s.text.length;
        const patch: Partial<Source> = better ? got : { status: s.text.trim() ? "thin" : "failed", error: s.text.trim() ? "Only a short excerpt was clipped. Paste more of the article if it matters." : got.error };
        update(target, (d) => ({ ...d, sources: d.sources.map((x) => (x.id === s.id ? { ...x, ...patch, id: s.id } : x)) }));
      });
    setView((v) => (v === "write" ? "split" : v));
  }, [update]);

  const cloudOn = sync !== "local";

  useEffect(() => {
    if (!ready) return;
    ingest();
    const onStorage = (e: StorageEvent) => e.key === INBOX && e.newValue && ingest();
    const onFocus = () => ingest();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, ingest, cloudOn]);

  const desk = desks.find((d) => d.id === activeId);
  if (!ready || !desk) return <div className="min-h-screen bg-canvas" />;

  const set = (fn: (d: Desk) => Desk) => update(desk.id, fn);
  const briefSources = (desk.briefSources ?? []).map((id) => desk.sources.find((s) => s.id === id)).filter(Boolean) as Source[];
  const evidence = briefSources.length ? briefSources : desk.sources.filter((s) => s.text.trim());

  const startFromAngle = (a: Angle) => {
    if (desk.draft.trim() && !confirm("Replace the current draft with a starting draft from this angle?")) return;
    const b = desk.brief!;
    const refs = evidence.map((s, i) => `[${i + 1}] ${s.title}${s.url ? `: ${s.url}` : ""}`).join("\n");
    const seed = [a.headline, b.whatHappened, b.whyItMatters, a.thesis, a.readerTakeaway, `Sources\n${refs}`].join("\n\n");
    set((d) => ({ ...d, draft: seed, original: seed, editorNotes: [], dismissed: [] }));
    setView("split");
  };

  const newDesk = () => {
    const d = blankDesk(desks.filter((x) => x.id !== "sample").length + 1);
    setDesks((all) => [d, ...all]);
    setActiveId(d.id);
    setView("research");
    setMenu(false);
    setWelcome(false);
  };

  const removeDesk = () => {
    if (!confirm(`Delete "${desk.name}"? This can't be undone.`)) return;
    const rest = desks.filter((d) => d.id !== desk.id);
    const next = rest.length ? rest : [sampleDesk];
    if (cloud.current) {
      dropDesk(workspace.current, desk.id).catch((e: Error) => {
        setSync("error");
        setSyncError(e.message);
      });
      synced.current.delete(desk.id);
    }
    setDesks(next);
    setActiveId(next[0].id);
    setMenu(false);
  };

  const restoreSample = () => {
    setDesks((all) => [sampleDesk, ...all.filter((d) => d.id !== "sample")]);
    setActiveId("sample");
    setMenu(false);
  };

  const rename = () => {
    const name = prompt("Name this issue", desk.name);
    if (name?.trim()) set((d) => ({ ...d, name: name.trim() }));
    setMenu(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-sheet/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-6 py-2.5 md:h-[56px] md:flex-nowrap md:py-0">
          <div className="flex min-w-0 items-center gap-4">
            <span className="shrink-0"><Logo /></span>
            <div className="hidden h-4 w-px bg-line sm:block" />
            <div className="relative min-w-0">
              <button onClick={() => setMenu(!menu)} className="flex min-w-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-soft hover:bg-mist hover:text-ink">
                <span className="max-w-[150px] truncate lg:max-w-[260px]">{desk.name}</span>
                <svg width="9" height="9" viewBox="0 0 10 10" className="shrink-0" aria-hidden><path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" /></svg>
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                  <div className="fade-in absolute left-0 top-9 z-50 w-72 overflow-hidden rounded-md border border-line bg-sheet py-1 text-[13px] shadow-[0_12px_36px_rgba(0,0,0,0.12)]">
                    {desks.map((d) => (
                      <button key={d.id} onClick={() => { setActiveId(d.id); setMenu(false); }} className={`flex w-full items-center justify-between px-3.5 py-2 text-left hover:bg-mist ${d.id === desk.id ? "font-medium" : "text-soft"}`}>
                        <span className="truncate">{d.name}</span>
                        <span className="ml-3 shrink-0 text-[11px] text-faint">{d.sources.length} sources</span>
                      </button>
                    ))}
                    <div className="my-1 border-t border-line" />
                    <button onClick={newDesk} className="block w-full px-3.5 py-2 text-left hover:bg-mist">New issue</button>
                    <button onClick={rename} className="block w-full px-3.5 py-2 text-left text-soft hover:bg-mist">Rename</button>
                    {!desks.some((d) => d.id === "sample") && <button onClick={restoreSample} className="block w-full px-3.5 py-2 text-left text-soft hover:bg-mist">Restore sample issue</button>}
                    <button onClick={removeDesk} className="block w-full px-3.5 py-2 text-left text-[#b3261e] hover:bg-mist">Delete</button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="order-last flex w-full justify-center md:order-none md:w-auto">
            <Segmented value={view} onChange={setView} options={[{ value: "research", label: "Research" }, { value: "split", label: "Split" }, { value: "write", label: "Write" }]} />
          </div>

          <nav className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px]">
            <SyncBadge state={sync} error={syncError} />
            <button onClick={() => setSheet("clipper")} className="rounded-md px-2.5 py-1.5 font-medium text-soft hover:bg-mist hover:text-ink">Clipper</button>
            <button onClick={() => setSheet("note")} className="rounded-md px-2.5 py-1.5 font-medium text-soft hover:bg-mist hover:text-ink">Product note</button>
          </nav>
        </div>
      </header>

      {welcome && desk.id === "sample" && (
        <div className="border-b border-line bg-mist/70">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-3 text-[13px]">
            <p className="text-soft">
              Sample issue with four real sources, a finished brief, and before/after edits. Open <span className="font-medium text-ink">Write → Compare</span> to see the changes.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="plain" onClick={newDesk}>Start your own</Button>
              <button onClick={() => { setWelcome(false); localStorage.setItem("subtext.welcomed", "1"); }} className="rounded-md px-2.5 py-1.5 text-faint hover:bg-sheet hover:text-ink">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <main className="px-6 pb-24 pt-9">
        {view === "research" && (
          <div className="mx-auto max-w-[760px]">
            <Intro title="Research" line="Collect what you've been reading. Subtext separates what the sources prove from what they merely claim, then suggests the story." />
            <ResearchPanel desk={desk} update={set} onUseAngle={startFromAngle} />
          </div>
        )}
        {view === "write" && (
          <div className="mx-auto max-w-[1180px]">
            <Intro title="Write" line="Your draft stays yours. Suggestions are marked, explained, and only applied when you accept them." />
            <EditorPanel desk={desk} update={set} sources={evidence} />
          </div>
        )}
        {view === "split" && (
          <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-4">
              <ResearchPanel desk={desk} update={set} onUseAngle={startFromAngle} compact />
            </div>
            <EditorPanel desk={desk} update={set} sources={evidence} narrow />
          </div>
        )}
      </main>

      <Sheet open={sheet === "clipper"} onClose={() => setSheet(null)} title="Save from anywhere">
        <Clipper cloud={cloudOn} />
      </Sheet>
      <Sheet open={sheet === "note"} onClose={() => setSheet(null)} title="Product and engineering note" wide>
        <ProductNote />
      </Sheet>
    </div>
  );
}

function SyncBadge({ state, error }: { state: SyncState; error: string }) {
  const look = {
    local: ["bg-faint", "Saved in this browser", "Local"],
    saving: ["bg-[#e6a817]", "Saving to Supabase", "Saving"],
    saved: ["bg-[#2f9e5b]", "Saved to Supabase", "Synced"],
    error: ["bg-[#d2453a]", error || "Sync failed", "Sync error"],
  }[state];
  return (
    <span title={look[1]} className="mr-1 hidden items-center gap-1.5 px-2 text-[12px] text-faint md:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${look[0]}`} />
      {look[2]}
    </span>
  );
}

function Intro({ title, line }: { title: string; line: string }) {
  return (
    <div className="mb-9 border-b border-line pb-7">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-soft">{line}</p>
    </div>
  );
}

function Clipper({ cloud }: { cloud: boolean }) {
  const link = useRef<HTMLAnchorElement>(null);
  const [origin, setOrigin] = useState("");
  const [id, setId] = useState("");
  const [other, setOther] = useState("");

  const join = () => {
    const next = other.trim();
    if (!/^[0-9a-f-]{36}$/i.test(next)) return alert("That doesn't look like a workspace ID.");
    if (!confirm("Switch to that workspace? Issues in this browser will be replaced by the ones saved there.")) return;
    switchWorkspace(next);
    location.reload();
  };

  useEffect(() => {
    const base = window.location.origin;
    setOrigin(base);
    setId(workspaceId());
    const code = `javascript:(()=>{const s=String(getSelection()).trim();const a=document.querySelector('article,main');const t=(s||(a||document.body).innerText).slice(0,20000);window.open('${base}/capture#'+encodeURIComponent(JSON.stringify({url:location.href,title:document.title,text:t})),'subtext','width=420,height=320')})()`;
    link.current?.setAttribute("href", code);
  }, []);

  return (
    <div className="space-y-6 text-[14px] leading-relaxed">
      <p className="text-soft">Save articles and posts while you read, the way you would with Pocket. Clipped pages land in whichever issue is open, with the text exactly as your browser sees it, so paywalled and logged-in pages work too.</p>

      <div>
        <h3 className="mb-2 font-medium">Bookmarklet</h3>
        <p className="mb-3 text-soft">Drag this to your bookmarks bar. Select a passage first to clip just that part.</p>
        <a ref={link} onClick={(e) => e.preventDefault()} className="inline-flex cursor-grab items-center gap-2 rounded-md border border-line bg-mist px-3.5 py-2 text-[13px] font-medium">
          Save to Subtext
        </a>
      </div>

      <div>
        <h3 className="mb-2 font-medium">Chrome extension</h3>
        <ol className="list-decimal space-y-1 pl-5 text-soft marker:text-faint">
          <li>Open <code className="rounded bg-mist px-1 text-[12.5px]">chrome://extensions</code> and turn on Developer mode.</li>
          <li>Choose <i>Load unpacked</i> and pick the <code className="rounded bg-mist px-1 text-[12.5px]">extension</code> folder from this repository.</li>
          <li>Open the extension once and set the Subtext address to <code className="rounded bg-mist px-1 text-[12.5px]">{origin}</code>.</li>
        </ol>
      </div>

      <div className="border-t border-line pt-5">
        <h3 className="mb-2 font-medium">Workspace</h3>
        {cloud ? (
          <>
            <p className="mb-3 text-soft">Issues and clips are saved to Supabase under this ID. Paste it on another device to open the same desk. Anyone with the ID can see it, so treat it like a private link.</p>
            <code className="block select-all rounded-md border border-line bg-mist px-3 py-2 text-[12.5px]">{id}</code>
            <div className="mt-3 flex gap-2">
              <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Paste a workspace ID" className="min-w-0 flex-1 rounded-md border border-line bg-sheet px-3 py-2 text-[13px] placeholder:text-faint" />
              <Button variant="plain" onClick={join} disabled={!other.trim()}>Open</Button>
            </div>
          </>
        ) : (
          <p className="text-soft">Issues are saved in this browser only. Add Supabase keys to the server to sync across devices.</p>
        )}
      </div>
    </div>
  );
}
