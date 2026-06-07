import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Download link to an export route (GET endpoint with Content-Disposition). */
export function ExportButton({ href, label = "Excel" }: { href: string; label?: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} download>
        <Download className="size-4" /> {label}
      </a>
    </Button>
  );
}
