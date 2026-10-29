import type { Brief, TaggedLine } from "@/lib/culture/types";
import { Panel, Tag } from "./ui";

function Lines({ items }: { items: TaggedLine[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {items.map((item) => (
        <li key={`${item.kind}-${item.text}`} className="text-sm text-fg">
          <Tag kind={item.kind}>{item.kind}</Tag>
          <p className="mt-1 text-fg">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="space-y-4">
      <Panel>
        <Tag kind="missing">Evidence status</Tag>
        <h2 className="mt-2 font-serif text-2xl">What is and is not known</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-mono text-xs tracking-widest text-lime uppercase">Supplied</h3>
            {brief.supplied.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {brief.supplied.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No observations attached. Nothing here was measured.</p>
            )}
          </div>
          <div>
            <h3 className="font-mono text-xs tracking-widest text-warn uppercase">Still missing</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              {brief.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">
          Frames from the wording: {brief.framesFired.length ? brief.framesFired.join(", ") : "none matched"}. The
          rule engine is {brief.generatedBy}. It does not browse the web.
        </p>
      </Panel>

      <Panel>
        <Tag kind="context">Cultural snapshot</Tag>
        <h2 className="mt-2 font-serif text-2xl">{brief.subject}</h2>
        <Lines items={brief.snapshot} />
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <Tag kind="hypothesis">Why it might resonate</Tag>
          <Lines items={brief.resonance} />
        </Panel>
        <Panel>
          <Tag kind="hypothesis">Possible audiences</Tag>
          <Lines items={brief.audiences} />
        </Panel>
        <Panel>
          <Tag kind="hypothesis">Alternative explanations</Tag>
          <Lines items={brief.alternatives} />
        </Panel>
        <Panel>
          <Tag kind="hypothesis">Brand opportunities</Tag>
          <Lines items={brief.opportunities} />
        </Panel>
      </div>

      <Panel>
        <Tag kind="missing">Risks</Tag>
        <Lines items={brief.risks} />
      </Panel>

      <Panel className="border-l-2 border-lime">
        <Tag kind="calculated">Next best action</Tag>
        <h2 className="mt-2 font-serif text-2xl">One inexpensive test</h2>
        <p className="mt-3 text-sm">{brief.nextAction.experiment}</p>
        <p className="mt-3 text-sm text-muted">
          <span className="text-fg">Worthwhile if: </span>
          {brief.nextAction.success}
        </p>
        <p className="mt-2 text-sm text-muted">
          <span className="text-fg">Stop if: </span>
          {brief.nextAction.stop}
        </p>
      </Panel>
    </div>
  );
}
