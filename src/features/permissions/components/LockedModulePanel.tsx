import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MODULE_LABELS, type ModuleKey } from "../moduleKeys";

export function LockedModulePanel({ moduleKey }: { moduleKey: ModuleKey }) {
  const name = MODULE_LABELS[moduleKey] ?? moduleKey;
  return (
    <Card>
      <CardContent className="space-y-4 p-8">
        <Badge>{name}</Badge>
        <h2 className="font-display text-2xl text-ink">Activate {name}</h2>
        <p className="max-w-lg text-sm text-ink-soft">
          This module is included on a paid plan, or can be unlocked for your account
          from the plan / module selection screen. Your existing events and data stay
          intact until then.
        </p>
        <Button href="/organizer" variant="primary">
          Back to dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
