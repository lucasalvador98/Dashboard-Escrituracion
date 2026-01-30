import React from 'react';

/**
 * Componente de navegación con tabs
 */
const Navigation = ({
  tabs = [],
  activeTab,
  onTabChange,
  subTabs = [],
  activeSubTab,
  onSubTabChange,
}) => {
  return (
    <div className="card">
      <div className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTabs && subTabs.length > 0 && (
        <div className="nav-subtabs">
          {subTabs.map((subTab, index) => (
            <button
              key={index}
              onClick={() => onSubTabChange?.(index)}
              className={`nav-subtab ${activeSubTab === index ? 'active' : ''}`}
              title={subTab}
            >
              {subTab.length > 30 ? `${subTab.substring(0, 30)}...` : subTab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Navigation;
