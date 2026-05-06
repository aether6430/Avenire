import Link from "next/link";
import { AvenireMark } from "@/components/branding/AvenireMark";

export const LogoSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return <AvenireMark {...props} />;
};

export const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <LogoSVG className="size-5 text-brand" />
      <span className="text-2xl font-medium tracking-tight text-white">
        Avenire
      </span>
    </Link>
  );
};
