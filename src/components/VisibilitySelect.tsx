import type { PageVisibility } from "@/db/schema";

const options: Array<{ value: PageVisibility; label: string }> = [
  { value: "campaign", label: "Kampagne" },
  { value: "public", label: "Public" },
  { value: "gm", label: "Nur GM" },
  { value: "private", label: "Privat" }
];

export function VisibilitySelect({ defaultValue = "campaign" }: { defaultValue?: PageVisibility }) {
  return (
    <label className="field">
      <span>Sichtbarkeit</span>
      <select className="select" name="visibility" defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
