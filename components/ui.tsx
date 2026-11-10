"use client";

import { useEffect } from "react";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5 select-none">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <rect x="1" y="4" width="16" height="2.4" rx="0.6" fill="currentColor" />
        <rect x="1" y="10.6" width="9.5" height="2.4" rx="0.6" fill="currentColor" opacity="0.35" />
      </svg>
      <span className="text-[16px] font-semibold tracking-[-0.03em]">Subtext</span>
    </span>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className={`inline-flex rounded-md border border-line bg-sheet p-0.5 ${size === "sm" ? "text-[12px]" : "text-[13px]"}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-[5px] font-medium transition-colors ${size === "sm" ? "px-2.5 py-1" : "px-3.5 py-1.5"} ${value === o.value ? "bg-ink text-white" : "text-soft hover:bg-mist hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/25 px-4 py-14 backdrop-blur-[3px]" onMouseDown={onClose}>
      <div className={`fade-in w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-lg border border-line bg-sheet shadow-[0_16px_48px_rgba(0,0,0,0.14)]`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-3.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-[13px] text-faint hover:bg-mist hover:text-ink">Close</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner() {
  return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-line border-t-ink align-[-2px]" />;
}

export function Button({ children, onClick, variant = "plain", disabled, title }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "plain" | "quiet"; disabled?: boolean; title?: string }) {
  const look = {
    primary: "bg-ink text-white hover:bg-[#2a2a2c] disabled:bg-faint disabled:text-white/80",
    plain: "border border-line bg-sheet text-ink hover:border-ink/25 hover:bg-mist disabled:text-faint",
    quiet: "text-soft hover:bg-mist hover:text-ink disabled:text-faint",
  }[variant];
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed ${look}`}
    >
      {children}
    </button>
  );
}
