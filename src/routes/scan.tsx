import { createFileRoute } from "@tanstack/react-router";
import { LabWorkspace } from "@/components/lab-workspace";

type ScanSearch = { q: string; mode: "quick" | "investigate"; caseId: string };

export const Route = createFileRoute("/scan")({
  validateSearch: (search: Record<string, unknown>): ScanSearch => ({
    q: typeof search.q === "string" ? search.q.slice(0, 500) : "",
    mode: search.mode === "investigate" ? "investigate" : "quick",
    caseId: typeof search.caseId === "string" ? search.caseId.slice(0, 80) : "",
  }),
  component: ScanPage,
});

function ScanPage() {
  const { q, mode, caseId } = Route.useSearch();
  return <LabWorkspace key={`${mode}:${q}:${caseId}`} mode={mode} seedQuestion={q} sampleCaseId={caseId || null} />;
}
