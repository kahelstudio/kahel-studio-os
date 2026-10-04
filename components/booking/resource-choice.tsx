"use client";

import styles from "./resource-choice.module.css";

type Requirement = { position: number; customerSelectable: boolean; typeName: string };
type SlotOption = { position: number; resources: Array<{ id: string; name: string }> };

/** "Photographer: ○ Any available ○ Luiz ○ …" for services whose requirements allow customer selection.
 *  Shows only resources marked public and free at the chosen time; renders nothing for other services. */
export function ResourceChoice({ requirements, options, value, disabled, onChange }: {
  requirements: Requirement[] | undefined; options: SlotOption[] | undefined; value: Record<string, string>; disabled: boolean;
  onChange: (value: Record<string, string>) => void;
}) {
  const selectable = (requirements ?? []).filter((r) => r.customerSelectable);
  if (!selectable.length || !options) return null;
  return (
    <>
      {selectable.map((requirement) => {
        const resources = options.find((o) => o.position === requirement.position)?.resources ?? [];
        const key = String(requirement.position);
        const noun = requirement.typeName.toLowerCase();
        const set = (id: string | null) => { const next = { ...value }; if (id) next[key] = id; else delete next[key]; onChange(next); };
        return (
          <fieldset key={key} className={styles.choice} disabled={disabled}>
            <legend>{requirement.typeName}</legend>
            <div className={styles.options} role="radiogroup">
              <label data-selected={!value[key]}><input type="radio" name={`resource-${key}`} checked={!value[key]} onChange={() => set(null)} />Any available {noun}</label>
              {resources.map((resource) => (
                <label key={resource.id} data-selected={value[key] === resource.id}><input type="radio" name={`resource-${key}`} checked={value[key] === resource.id} onChange={() => set(resource.id)} />{resource.name}</label>
              ))}
            </div>
            {resources.length === 0 && <p className={styles.hint}>We&apos;ll assign an available {noun} for this time.</p>}
          </fieldset>
        );
      })}
    </>
  );
}
