import React from 'react';
import '../styles/ExperienceFilter.css';

export default function ExperienceFilter({ selected, onChange }) {
  const options = [
    { label: '0 años', value: 0 },
    { label: '1 año', value: 1 },
    { label: '2 años', value: 2 },
    { label: '3+ años', value: 3 }
  ];

  return (
    <div className="experience-filter">
      <label className="filter-label">Experiencia requerida:</label>
      <div className="filter-buttons">
        <button
          className={`filter-btn ${selected === null ? 'active' : ''}`}
          onClick={() => onChange(null)}
        >
          Todos
        </button>
        {options.map(option => (
          <button
            key={option.value}
            className={`filter-btn ${selected === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
