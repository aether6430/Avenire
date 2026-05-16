import Link from "next/link";
import { AvenireMark } from "@/components/branding/AvenireMark";

export const LogoSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return <AvenireMark {...props} />;
};

export const Logo = () => {
  return (
    <Link className="flex items-center gap-3" href="/">
      <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] shadow-aceternity">
        <LogoSVG className="size-4 text-brand" />
      </span>
      <span className="font-semibold text-[1.15rem] text-white">Avenire</span>
    </Link>
  );
};
