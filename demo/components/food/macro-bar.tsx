export function MacroBar({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const p = protein * 4;
  const c = carbs * 4;
  const f = fat * 9;
  const total = Math.max(1, p + c + f);
  const pp = (p / total) * 100;
  const cp = (c / total) * 100;
  const fp = (f / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden">
        <div style={{ width: `${pp}%`, background: "var(--success)" }} />
        <div style={{ width: `${cp}%`, background: "var(--warning)" }} />
        <div style={{ width: `${fp}%`, background: "var(--accent)" }} />
      </div>
      <div className="flex justify-between font-mono text-[12px] text-[color:var(--text-secondary)]">
        <span>P {Math.round(protein)}g</span>
        <span>C {Math.round(carbs)}g</span>
        <span>F {Math.round(fat)}g</span>
      </div>
    </div>
  );
}
