export function PermissionList({ allows, never }: { allows: string[]; never: string[] }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium text-ink">What you allow</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
          {allows.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium text-ink">What we never do</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
          {never.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
