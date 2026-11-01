import { FilterTabs, type FilterTab } from "./FilterTabs";

export type CompetitionFilterTab = FilterTab;

/**
 * C3 competition/track filter strip — same chrome as list FilterTabs,
 * named for hackathon/competition surfaces (ENGINEERING_RULES C3).
 */
export function CompetitionFilter({
  tabs,
  activeValue,
  label = "Competition filters",
}: {
  tabs: CompetitionFilterTab[];
  activeValue: string;
  label?: string;
}) {
  return <FilterTabs tabs={tabs} activeValue={activeValue} label={label} />;
}
