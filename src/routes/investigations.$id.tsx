import { createFileRoute, Link } from "@tanstack/react-router";
import { LabWorkspace } from "@/components/lab-workspace";
import { useLab } from "@/lib/culture/store";

export const Route = createFileRoute("/investigations/$id")({ component: InvestigationPage });

function InvestigationPage() {
  const { id } = Route.useParams();
  const hydrated = useLab((state) => state.hydrated);
  const investigation = useLab((state) => state.investigations.find((item) => item.id === id) ?? null);

  if (!hydrated) return <p className="text-sm text-muted">Opening the local file…</p>;
  if (!investigation) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-4xl">This investigation is not on this device.</h1>
        <p className="mt-3 text-muted">It may have been deleted, or it was saved in another browser.</p>
        <Link to="/investigations" className="mt-5 inline-flex min-h-11 items-center text-lime">
          Back to the shelf
        </Link>
      </div>
    );
  }
  return <LabWorkspace key={investigation.id} mode="investigate" investigation={investigation} />;
}
