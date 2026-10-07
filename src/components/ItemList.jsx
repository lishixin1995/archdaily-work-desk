import { useDesk, useUi } from '../desk.jsx';
import { metaFor } from '../lib/agenda.js';
import { today } from '../lib/dates.js';
import { setHighlight } from '../lib/highlight.js';
import { isOverdue, spanInfo, tokenFor } from '../lib/tasks.js';
import { StatusSelect } from './LevelPills.jsx';

function SpanBar({ item, day }) {
  const { total, index } = spanInfo(item, day);
  if (total < 2) return null;
  const shown = Math.min(total, 21);
  return (
    <span className="span-bar" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <i key={i} className={i < index - 1 ? 'past' : i === index - 1 ? 'now' : ''} />
      ))}
      {total > shown ? <em>+{total - shown}</em> : null}
    </span>
  );
}

// One task: done circle, title (opens the task), a meta line and its status.
// `meta` overrides the line under the title; `day` gives a day-specific line.
// `compact` puts the status under the text, for narrow columns.
export function ItemRow({ item, day, span = false, meta, note = false, compact = false }) {
  const { toggleItem, setTaskStatus } = useDesk();
  const { flashId, openItem } = useUi();
  const now = today();
  const status = <StatusSelect value={item.status} label={`Status for ${item.title}`} onChange={(next) => setTaskStatus(item.id, next)} />;
  const classes = ['item'];
  if (item.done) classes.push('is-done');
  if (isOverdue(item, now)) classes.push('is-overdue');
  if (flashId === item.id) classes.push('is-new');
  if (compact) classes.push('is-compact');

  return (
    <li className={classes.join(' ')} data-hl={item.id} style={{ '--c': `var(${tokenFor({ ...item, done: false })})` }} onPointerEnter={() => setHighlight([item.id])}>
      <button type="button" className="check" role="checkbox" aria-checked={item.done} aria-label={item.title} onClick={() => toggleItem(item)} />
      <div className="item-body">
        <button type="button" className="item-title" onClick={() => openItem(item)}>{item.title}</button>
        <span className="item-meta">{meta ? meta(item) : metaFor(item, day, now)}</span>
        {note && item.task.notes ? <span className="item-note">{item.task.notes}</span> : null}
        {span && day ? <SpanBar item={item} day={day} /> : null}
        {compact ? status : null}
      </div>
      {compact ? null : status}
    </li>
  );
}

export function Groups({ groups, day, span = false, meta, empty = 'Nothing here yet.' }) {
  if (!groups.length) return <p className="empty">{empty}</p>;
  return (
    <div className="groups" onPointerLeave={() => setHighlight([])}>
      {groups.map((group) => (
        <section className="group" key={group.key}>
          <h3 className="group-title" style={{ '--c': `var(${group.token})` }}>
            <span className="gt-name"><i />{group.title}</span>
            <span>{group.items.length}</span>
          </h3>
          <ul className="items">
            {group.items.map((item) => <ItemRow key={item.id} item={item} day={day} span={span} meta={meta} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
