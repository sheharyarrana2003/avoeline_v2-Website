import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function ProfileCard({
  name,
  role,
  tags,
}: {
  name: string;
  role: string;
  tags: string[];
}) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-ink">{name}</h3>
          <Badge>{role}</Badge>
        </div>
        <p className="text-xs text-ink-soft">{tags.filter(Boolean).join(" · ") || "No tags yet"}</p>
      </CardBody>
    </Card>
  );
}
