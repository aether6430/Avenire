import { AvenireMark } from "@/components/branding/AvenireMark";

export const LogoSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return <AvenireMark {...props} />;
};

export const Logo = () => {
  return (
    <a className="flex items-center gap-2.5 text-white" href="/">
      <LogoSVG className="size-4 text-brand" />
      <span className="font-semibold text-[1.1rem] tracking-tight">
        Avenire
      </span>
    </a>
  );
};
