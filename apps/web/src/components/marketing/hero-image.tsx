import Image from "next/image";
import { STATIC_ASSETS } from "@/lib/static-assets";
import { Container } from "./container";

export const HeroImage = () => {
  return (
    <Container className="perspective-distant relative flex items-start justify-start border-divide border-x bg-neutral-900/70 p-2 md:p-4 lg:p-8">
      <StaticDot left top />
      <StaticDot right top />
      <StaticDot bottom left />
      <StaticDot bottom right />
      <div className="group relative w-full">
        <div className="relative z-10 h-full w-full transform-gpu transition duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-[0.15deg] group-hover:scale-[1.01]">
          <Image
            alt="Avenire workspace with a paper, generated ResNet notes, and an interactive learning widget"
            className="w-full rounded-md border border-white/10 shadow-2xl shadow-black/60"
            draggable={false}
            height={1019}
            priority
            sizes="100vw"
            src={STATIC_ASSETS.avenireWorkspace}
            width={1918}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 z-0 m-auto h-[90%] w-[95%] rounded-lg border border-(--pattern-fg) bg-[image:repeating-linear-gradient(315deg,_var(--pattern-fg)_0,_var(--pattern-fg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed transition duration-500 ease-out group-hover:scale-[1.015] group-hover:opacity-90" />
      </div>
    </Container>
  );
};

const StaticDot = ({
  top,
  left,
  right,
  bottom,
}: {
  top?: boolean;
  left?: boolean;
  right?: boolean;
  bottom?: boolean;
}) => {
  return (
    <div
      className={[
        "absolute z-10 h-2 w-2 bg-(--avenire-marketing-primary) shadow-[0_0_10px_rgba(255,255,255,0.08)]",
        top ? "top-0 xl:-top-1" : "",
        left ? "left-0 xl:-left-2" : "",
        right ? "right-0 xl:-right-2" : "",
        bottom ? "bottom-0 xl:-bottom-1" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
};
