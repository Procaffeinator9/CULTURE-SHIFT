import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  FileText,
  FlaskConical,
  FolderOpen,
  Radar,
  ScanLine,
  SlidersHorizontal,
  Timer,
} from "lucide-react";
import { useLab } from "@/lib/culture/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: Compass, exact: true },
  { to: "/radar", label: "Trend Radar", icon: Radar, exact: true },
  { to: "/scan", label: "Quick Scan", icon: ScanLine, exact: true },
  { to: "/investigations", label: "Investigations", icon: FolderOpen, exact: false },
  { to: "/simulator", label: "Culture Simulator", icon: FlaskConical, exact: true },
  { to: "/halflife", label: "Half-Life Lab", icon: Timer, exact: true },
  { to: "/reports", label: "Reports", icon: FileText, exact: true },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal, exact: true },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const draft = useLab((state) => state.draft);
  const question = draft?.question?.trim() ?? "";

  useEffect(() => {
    void Promise.resolve(useLab.persist.rehydrate()).finally(() => {
      useLab.getState().setHydrated(true);
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <aside className="border-b border-line bg-panel md:fixed md:inset-y-0 md:z-20 md:w-60 md:border-r md:border-b-0">
        <div className="px-5 py-4 md:py-6">
          <Link to="/" className="font-mono text-sm tracking-widest text-fg">
            CULTURE<span className="text-lime">//</span>SHIFT
          </Link>
          <p className="mt-1 hidden font-mono text-xs tracking-widest text-muted uppercase md:block">
            Signals · Evidence · Decisions
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3 md:pb-8" aria-label="Sections">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            const className = cn(
              "flex min-h-11 shrink-0 items-center gap-2 border-l-2 border-transparent px-3 text-sm text-muted transition-colors duration-200 hover:text-fg",
              active && "border-lime bg-panel-2 text-fg",
            );
            const inner = (
              <>
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </>
            );
            if (item.to === "/scan") {
              return (
                <Link
                  key={item.to}
                  to="/scan"
                  search={{ q: question, mode: "quick", caseId: draft?.sampleCaseId ?? "" }}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  {inner}
                </Link>
              );
            }
            if (item.to === "/simulator") {
              return (
                <Link
                  key={item.to}
                  to="/simulator"
                  search={{ q: question.slice(0, 200) }}
                  aria-current={active ? "page" : undefined}
                  className={className}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={className}>
                {inner}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="md:pl-60">
        <main className="px-4 py-6 md:px-10 md:py-10">
          {question && pathname !== "/" ? (
            <p className="mb-6 max-w-3xl font-mono text-xs tracking-widest text-muted uppercase">
              Working question · {question}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
