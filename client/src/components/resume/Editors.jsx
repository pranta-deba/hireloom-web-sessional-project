import DatePicker from 'react-datepicker';
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';

/** "YYYY-MM" ⇄ Date */
const toDate = (v) => {
  if (!v) return null;
  const [y, m] = String(v).split('-').map(Number);
  return y ? new Date(y, (m || 1) - 1, 1) : null;
};
const fromDate = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '');

export function MonthPicker({ value, onChange, disabled, placeholder = 'Select month' }) {
  return (
    <DatePicker
      selected={toDate(value)}
      onChange={(d) => onChange(fromDate(d))}
      dateFormat="MMM yyyy"
      showMonthYearPicker
      placeholderText={placeholder}
      disabled={disabled}
      isClearable={!disabled && !!value}
      maxDate={new Date(new Date().getFullYear() + 6, 11, 1)}
    />
  );
}

/**
 * Generic repeatable-group editor (multiple text boxes + dropdowns per row).
 * fields: [{ key, label, type: 'text'|'textarea'|'select'|'month'|'checkbox', options, span, placeholder, disabledWhen }]
 */
export function ListEditor({ items = [], onChange, fields, blank, addLabel = 'Add item', titleOf }) {
  const update = (i, key, value) => onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <div className="list-editor">
      {items.map((it, i) => (
        <div className="list-editor__item" key={i}>
          <div className="list-editor__bar">
            <strong>{titleOf?.(it) || `#${i + 1}`}</strong>
            <div className="row" style={{ '--gap': '2px' }}>
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                <FiChevronUp />
              </button>
              <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">
                <FiChevronDown />
              </button>
              <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(i)} aria-label="Remove">
                <FiTrash2 />
              </button>
            </div>
          </div>
          <div className="form-grid">
            {fields.map((f) => {
              const disabled = f.disabledWhen?.(it);
              const id = `${f.key}-${i}`;
              return (
                <div key={f.key} className={`field ${f.span ? 'span-2' : ''}`}>
                  {f.type !== 'checkbox' && <label htmlFor={id}>{f.label}</label>}
                  {f.type === 'textarea' ? (
                    <textarea id={id} className="textarea" rows={4} value={it[f.key] || ''} placeholder={f.placeholder} onChange={(e) => update(i, f.key, e.target.value)} />
                  ) : f.type === 'select' ? (
                    <select id={id} className="select" value={it[f.key] || f.options[0]} onChange={(e) => update(i, f.key, e.target.value)}>
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === 'month' ? (
                    <MonthPicker value={disabled ? '' : it[f.key]} disabled={disabled} placeholder={disabled ? 'Present' : 'Select month'} onChange={(v) => update(i, f.key, v)} />
                  ) : f.type === 'checkbox' ? (
                    <label className="switch" style={{ marginTop: 26 }}>
                      <input type="checkbox" checked={!!it[f.key]} onChange={(e) => update(i, f.key, e.target.checked)} />
                      <span className="switch__track" />
                      {f.label}
                    </label>
                  ) : (
                    <input id={id} className="input" value={it[f.key] || ''} placeholder={f.placeholder} onChange={(e) => update(i, f.key, e.target.value)} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--soft btn--block" onClick={() => onChange([...items, { ...blank }])}>
        <FiPlus /> {addLabel}
      </button>
    </div>
  );
}
