export type SourceStatus = "loading" | "ready" | "thin" | "failed";

export interface Source {
  id: string;
  url: string;
  title: string;
  site: string;
  kind: "article" | "tweet" | "note";
  text: string;
  status: SourceStatus;
  error?: string;
  addedAt: number;
}

export interface Citation {
  source: number;
  quote: string;
  verified: boolean;
}

export interface Claim {
  text: string;
  citations: Citation[];
}

export interface Speculation {
  text: string;
  kind: "analysis" | "speculation" | "vendor claim";
  citations: Citation[];
  unverified?: boolean;
}

export interface Angle {
  headline: string;
  thesis: string;
  readerTakeaway: string;
}

export interface Brief {
  whatHappened: string;
  perSource: { source: number; takeaway: string }[];
  whyItMatters: string;
  audiences: { founders: string; builders: string; operators: string };
  facts: Claim[];
  speculation: Speculation[];
  angles: Angle[];
  openQuestions: string[];
  generatedAt: number;
}

export type IssueKind = "long" | "passive" | "filler" | "dense" | "jargon" | "clarity" | "repetition" | "accuracy";

export interface Suggestion {
  id: string;
  kind: IssueKind;
  passage: string;
  why: string;
  rewrite?: string;
  origin: "rules" | "editor";
}

export interface Desk {
  id: string;
  name: string;
  sources: Source[];
  brief?: Brief;
  briefSources?: string[];
  original: string;
  draft: string;
  editorNotes: Suggestion[];
  dismissed: string[];
  updatedAt: number;
}
