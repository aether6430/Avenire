import {
  CheckCircle as CheckCircle2,
  Circle,
  ArrowSquareOut as ExternalLink,
  SpinnerGap as Loader2,
} from "@phosphor-icons/react/ssr";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { RoadmapGroup, RoadmapItem } from "@/lib/roadmap";
import { getRoadmapGroups } from "@/lib/roadmap";

export const metadata = buildPageMetadata({
  description:
    "See what Avenire is building next across AI learning, study workflows, and collaborative research.",
  path: "/roadmap",
  title: "Roadmap",
});

const statusConfig = {
  planned: {
    icon: Circle,
    label: "Planned",
    color: "text-muted-foreground",
    dotColor: "bg-muted-foreground/50",
    borderColor: "border-border",
    badgeBg: "bg-muted",
    badgeText: "text-muted-foreground",
  },
  "in-progress": {
    icon: Loader2,
    label: "In Progress",
    color: "text-primary",
    dotColor: "bg-primary",
    borderColor: "border-primary/30",
    badgeBg: "bg-primary/10",
    badgeText: "text-primary",
  },
  shipped: {
    icon: CheckCircle2,
    label: "Shipped",
    color: "text-chart-2",
    dotColor: "bg-chart-2",
    borderColor: "border-chart-2/20",
    badgeBg: "bg-chart-2/10",
    badgeText: "text-chart-2",
  },
};

function RoadmapCard({ item }: { item: RoadmapItem }) {
  const cfg = statusConfig[item.status];
  const Icon = cfg.icon;

  return (
    <article
      className={`group rounded-xl border ${cfg.borderColor} bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-black/10 hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
          <Icon
            className={`size-4.5 ${item.status === "in-progress" ? "animate-spin [animation-duration:3s]" : ""}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <h3 className="font-medium text-foreground text-sm leading-snug">
              {item.title}
            </h3>
            {item.link && (
              <a
                aria-label={`Learn more about ${item.title}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                href={item.link}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {item.description}
          </p>

          {item.category && (
            <div className="mt-3">
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                {item.category}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RoadmapColumn({ group }: { group: RoadmapGroup }) {
  const cfg = statusConfig[group.status];

  return (
    <div className="flex flex-col gap-4">
      {/* Column header */}
      <div className="flex items-center gap-2.5 border-border border-b pb-4">
        <div className={`size-2 rounded-full ${cfg.dotColor}`} />
        <h2 className="font-semibold text-foreground text-sm">{group.label}</h2>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-medium text-xs ${cfg.badgeBg} ${cfg.badgeText}`}
        >
          {group.items.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className="flex flex-col gap-3 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(4 * 88px + 3 * 12px)" }}
      >
        {group.items.map((item) => (
          <RoadmapCard item={item} key={item.id} />
        ))}
        {group.items.length === 0 && (
          <p className="py-6 text-center text-muted-foreground/50 text-xs">
            Nothing here yet.
          </p>
        )}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const groups = getRoadmapGroups();

  return (
    <main className="avenire-marketing-scope dark min-h-screen bg-neutral-950 text-neutral-100">
      <Navbar />

      {/* Hero */}
      <section className="px-4 pt-32">
        <div className="mx-auto max-w-[72rem] border-divide border-x px-4 pt-8 pb-16 md:px-8">
        <div className="mx-auto max-w-[62rem]">
          <div className="mb-2">
            <span className="font-medium text-brand text-xs uppercase tracking-widest">
              Roadmap
            </span>
          </div>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-4 font-semibold text-4xl text-white tracking-tight md:text-5xl">
                What &apos;s Coming Next
              </h1>
              <p className="max-w-xl text-lg text-white/60 leading-relaxed">
                A transparent look at what we&apos;re building. We update this
                as our plans evolve.
              </p>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Roadmap columns */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-[72rem] border-divide border-x px-4 pb-8 md:px-8">
        <div className="mx-auto max-w-[62rem]">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {groups.map((group) => (
              <RoadmapColumn group={group} key={group.status} />
            ))}
          </div>
        </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
