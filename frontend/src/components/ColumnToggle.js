import React from "react";

export default function ColumnToggle({ columns, groups, visibleCols, onToggle, onClose }) {
  return (
    <div className="col-toggle-dropdown">
      <div className="col-toggle-header">
        <span className="col-toggle-title">Columnas visibles</span>
        <button className="col-toggle-close" onClick={onClose}>✕</button>
      </div>
      <div className="col-toggle-body">
        {groups.map(group => (
          <div key={group.label} className="col-toggle-group">
            <div className="col-toggle-group-label">{group.label}</div>
            {group.keys.map(key => {
              const col = columns.find(c => c.key === key);
              if (!col) return null;
              return (
                <label key={key} className="col-toggle-item">
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(key)}
                    onChange={() => onToggle(key)}
                    disabled={col.alwaysOn && visibleCols.includes(key) && columns.filter(c => c.alwaysOn).length === 1}
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
