import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  canCreate?: boolean;
  createTo?: string;
  createLabel?: string;
  extra?: ReactNode;
}

export function CrudPageHeader({ title, description, canCreate, createTo, createLabel = "Novo", extra }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {canCreate && createTo ? (
          <Button asChild size="sm">
            <Link to={createTo}>
              <Plus className="mr-1 h-4 w-4" />
              {createLabel}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
