import { PRIORITIES, PRIORITY_TOKEN, STATUSES, STATUS_TOKEN } from '../lib/tasks.js';

function Pills({ name, options, tokens, value, onChange, legend }) {
  return (
    <fieldset className="levels">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option} className="level-pill" style={{ '--c': `var(${tokens[option]})` }}>
          <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function PriorityPills({ name, value, onChange }) {
  return <Pills name={name} options={PRIORITIES} tokens={PRIORITY_TOKEN} value={value} onChange={onChange} legend="Priority" />;
}

export function StatusPills({ name, value, onChange }) {
  return <Pills name={name} options={STATUSES} tokens={STATUS_TOKEN} value={value} onChange={onChange} legend="Status" />;
}

// Compact status picker shown at the end of a task row.
export function StatusSelect({ value, onChange, label }) {
  return (
    <select
      className="level-select"
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
    >
      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
    </select>
  );
}
