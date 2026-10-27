import React from 'react';

// The same menu shape as the eval bundle: a list on a laptop, a select on a phone.
export default function GateMenu({ scenarios, selectedId, onSelect }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">
        Check to run
        <select
          value={selectedId}
          onChange={(event) => onSelect(event.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
        >
          {scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name} — {scenario.level}
            </option>
          ))}
        </select>
      </label>

      <nav className="hidden rounded-xl border border-border bg-card p-2 lg:block">
        <p className="px-2 pb-2 pt-1 font-heading text-[10px] uppercase tracking-widest text-muted-foreground">Gates</p>
        {scenarios.map((scenario) => {
          const active = scenario.id === selectedId;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => onSelect(scenario.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              title={scenario.threat}
            >
              <span>{scenario.name}</span>
              <span className={`font-mono text-[10px] uppercase ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {scenario.level}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}