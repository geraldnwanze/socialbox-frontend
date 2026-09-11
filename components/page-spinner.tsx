import { Loader2 } from "lucide-react";

export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
