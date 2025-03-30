"use client";

import dynamic from "next/dynamic";

const GraphComp = dynamic(
  () => import("./desmos").then((mod) => mod.GraphComp),
  {
    ssr: false,
  }
);

export const Canvas = () => {
  return (
    <div className="w-full h-full">
      <GraphComp />
    </div>
  )
}

