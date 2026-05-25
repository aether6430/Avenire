import { cn } from "../lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-md bg-muted", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
