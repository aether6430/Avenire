import roadmapData from "@/content/roadmap.json";

export type RoadmapStatus = "planned" | "in-progress" | "shipped";

export interface RoadmapItem {
  category?: string;
  description: string;
  id: string;
  link?: string;
  status: RoadmapStatus;
  title: string;
}

export interface RoadmapGroup {
  items: RoadmapItem[];
  label: string;
  status: RoadmapStatus;
}

export function getRoadmapGroups(): RoadmapGroup[] {
  const items: RoadmapItem[] = roadmapData as RoadmapItem[];

  const groups: RoadmapGroup[] = [
    {
      label: "Shipped",
      status: "shipped",
      items: items.filter((i) => i.status === "shipped"),
    },
    {
      label: "In Progress",
      status: "in-progress",
      items: items.filter((i) => i.status === "in-progress"),
    },
    {
      label: "Planned",
      status: "planned",
      items: items.filter((i) => i.status === "planned"),
    },
  ];

  return groups;
}
