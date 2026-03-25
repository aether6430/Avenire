"use client";

import { MeshGradient } from "@paper-design/shaders-react";

export const ShaderWave = () => {
  return (
    <MeshGradient
      width={1280}
      height={720}
      colors={["#add1ff", "#241d9a", "#f75092"]}
      distortion={0.8}
      swirl={0.13}
      grainMixer={0.85}
      grainOverlay={0.28}
      speed={0.68}
      scale={1.48}
      rotation={32}
      offsetX={0.1}
    />
  );
};
