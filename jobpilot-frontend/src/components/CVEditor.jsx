import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, Save, X } from 'lucide-react';
import { cvAPI } from '../services/api';
import { toast } from 'sonner';

export default function CVEditor({ cv, onSave, loading = false }) {
  const [formData, setFormData] = useState({
    summary: cv?.summary || '',
    skills: cv?.skills || [],
    experience_years: cv?.experience_years || 0,
    experience: cv?.experience || [],
    education: cv?.education || [],
    certifications: cv?.certifications || []
  });

  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    skills: true,
    experienceYears: true,
    experience: true,
    education: false,
    certifications: false
  });

  const [editingExperience, setEditingExperience] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);
  const [editingCertification, setEditingCertification] = useState(null);
  const [newSkill, setNewSkill] = useState('');

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSummaryChange = (e) => {
    setFormData(prev => ({
      ...prev,
      summary: e.target.value
    }));
  };

  const handleExperienceYearsChange = (e) => {
    setFormData(prev => ({
      ...prev,
      experience_years: parseInt(e.target.value) || 0
    }));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        position: '',
        company: '',
        start_date: '',
        end_date: '',
        description: ''
      }]
    }));
  };

  const updateExperience = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, {
        school: '',
        degree: '',
        field: '',
        graduation_year: new Date().getFullYear()
      }]
    }));
  };

  const updateEducation = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, {
        title: '',
        issuer: '',
        issue_date: '',
        expiration_date: ''
      }]
    }));
  };

  const updateCertification = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) =>
        i === index ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    try {
      const response = await cvAPI.update(cv.id, formData);
      toast.success('CV actualizado correctamente');
      onSave(response.data.cv);
    } catch (error) {
      console.error('Error saving CV:', error);
      toast.error('Error al guardar los cambios');
    }
  };

  return (
    <div className="w-full bg-black-3 border border-gray-1 rounded-lg">
      {/* Summary Section */}
      <div className="border-b border-gray-1">
        <button
          onClick={() => toggleSection('summary')}
          className="w-full flex items-center justify-between p-lg hover:bg-black transition"
        >
          <h3 className="text-base font-semibold text-white">Resumen Profesional</h3>
          <ChevronDown
            size={20}
            className={`text-gray-4 transition ${expandedSections.summary ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.summary && (
          <div className="px-lg pb-lg">
            <textarea
              value={formData.summary}
              onChange={handleSummaryChange}
              placeholder="Escribe un resumen de tu perfil profesional..."
              className="w-full p-md border border-gray-1 rounded bg-black text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent resize-none"
              rows={4}
            />
          </div>
        )}
      </div>

      {/* Skills Section */}
      <div className="border-b border-gray-1">
        <button
          onClick={() => toggleSection('skills')}
          className="w-full flex items-center justify-between p-lg hover:bg-black transition"
        >
          <h3 className="text-base font-semibold text-white">Skills Técnicos</h3>
          <ChevronDown
            size={20}
            className={`text-gray-4 transition ${expandedSections.skills ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.skills && (
          <div className="px-lg pb-lg">
            <div className="flex gap-md mb-lg">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Agregar skill..."
                className="flex-1 px-md py-xs border border-gray-1 rounded bg-black text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent"
              />
              <button
                onClick={addSkill}
                className="px-md py-xs bg-red text-white rounded hover:bg-red/80 transition flex items-center gap-xs"
              >
                <Plus size={16} /> Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-md">
              {formData.skills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center gap-xs px-md py-xs bg-red text-white rounded"
                >
                  <span className="text-xs">{skill}</span>
                  <button
                    onClick={() => removeSkill(index)}
                    className="hover:opacity-80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Experience Years Section */}
      <div className="border-b border-gray-1">
        <button
          onClick={() => toggleSection('experienceYears')}
          className="w-full flex items-center justify-between p-lg hover:bg-black transition"
        >
          <h3 className="text-base font-semibold text-white">Años de Experiencia</h3>
          <ChevronDown
            size={20}
            className={`text-gray-4 transition ${expandedSections.experienceYears ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.experienceYears && (
          <div className="px-lg pb-lg">
            <div className="space-y-md">
              <label className="block text-sm text-gray-4">
                Total de años de experiencia profesional
              </label>
              <input
                type="number"
                min="0"
                max="70"
                value={formData.experience_years}
                onChange={handleExperienceYearsChange}
                className="w-full px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
              />
              <p className="text-xs text-gray-4">
                Este valor se utiliza para filtrar empleos según tu nivel de experiencia.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Experience Section */}
      <div className="border-b border-gray-1">
        <button
          onClick={() => toggleSection('experience')}
          className="w-full flex items-center justify-between p-lg hover:bg-black transition"
        >
          <h3 className="text-base font-semibold text-white">Experiencia Laboral</h3>
          <ChevronDown
            size={20}
            className={`text-gray-4 transition ${expandedSections.experience ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.experience && (
          <div className="px-lg pb-lg space-y-lg">
            {formData.experience.map((exp, index) => (
              <div key={index} className="p-md border border-gray-1 rounded bg-black space-y-md">
                <div className="grid grid-cols-2 gap-md">
                  <input
                    type="text"
                    placeholder="Puesto"
                    value={exp.position}
                    onChange={(e) => updateExperience(index, 'position', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Empresa"
                    value={exp.company}
                    onChange={(e) => updateExperience(index, 'company', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <input
                    type="date"
                    placeholder="Fecha inicio"
                    value={exp.start_date}
                    onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                  <input
                    type="date"
                    placeholder="Fecha fin"
                    value={exp.end_date}
                    onChange={(e) => updateExperience(index, 'end_date', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                </div>
                <textarea
                  placeholder="Descripción de responsabilidades"
                  value={exp.description}
                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  className="w-full px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent resize-none text-sm"
                  rows={2}
                />
                <button
                  onClick={() => removeExperience(index)}
                  className="w-full px-md py-xs text-red hover:bg-red/10 rounded transition flex items-center justify-center gap-xs text-sm"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            ))}
            <button
              onClick={addExperience}
              className="w-full px-md py-xs border-2 border-dashed border-gray-1 text-gray-4 rounded hover:border-red hover:text-red transition flex items-center justify-center gap-xs text-sm"
            >
              <Plus size={16} /> Agregar Experiencia
            </button>
          </div>
        )}
      </div>

      {/* Education Section */}
      <div className="border-b border-gray-1">
        <button
          onClick={() => toggleSection('education')}
          className="w-full flex items-center justify-between p-lg hover:bg-black transition"
        >
          <h3 className="text-base font-semibold text-white">Educación</h3>
          <ChevronDown
            size={20}
            className={`text-gray-4 transition ${expandedSections.education ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.education && (
          <div className="px-lg pb-lg space-y-lg">
            {formData.education.map((edu, index) => (
              <div key={index} className="p-md border border-gray-1 rounded bg-black space-y-md">
                <input
                  type="text"
                  placeholder="Institución/Universidad"
                  value={edu.school}
                  onChange={(e) => updateEducation(index, 'school', e.target.value)}
                  className="w-full px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                />
                <div className="grid grid-cols-2 gap-md">
                  <input
                    type="text"
                    placeholder="Grado"
                    value={edu.degree}
                    onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Campo de estudio"
                    value={edu.field}
                    onChange={(e) => updateEducation(index, 'field', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Año de graduación"
                  value={edu.graduation_year}
                  onChange={(e) => updateEducation(index, 'graduation_year', parseInt(e.target.value))}
                  className="w-full px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                />
                <button
                  onClick={() => removeEducation(index)}
                  className="w-full px-md py-xs text-red hover:bg-red/10 rounded transition flex items-center justify-center gap-xs text-sm"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            ))}
            <button
              onClick={addEducation}
              className="w-full px-md py-xs border-2 border-dashed border-gray-1 text-gray-4 rounded hover:border-red hover:text-red transition flex items-center justify-center gap-xs text-sm"
            >
              <Plus size={16} /> Agregar Educación
            </button>
          </div>
        )}
      </div>

      {/* Certifications Section */}
      <div className="border-b border-gray-1">
        <button
          onClick={() => toggleSection('certifications')}
          className="w-full flex items-center justify-between p-lg hover:bg-black transition"
        >
          <h3 className="text-base font-semibold text-white">Certificaciones</h3>
          <ChevronDown
            size={20}
            className={`text-gray-4 transition ${expandedSections.certifications ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.certifications && (
          <div className="px-lg pb-lg space-y-lg">
            {formData.certifications.map((cert, index) => (
              <div key={index} className="p-md border border-gray-1 rounded bg-black space-y-md">
                <input
                  type="text"
                  placeholder="Título de certificación"
                  value={cert.title}
                  onChange={(e) => updateCertification(index, 'title', e.target.value)}
                  className="w-full px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  placeholder="Emisor"
                  value={cert.issuer}
                  onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                  className="w-full px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                />
                <div className="grid grid-cols-2 gap-md">
                  <input
                    type="date"
                    placeholder="Fecha de emisión"
                    value={cert.issue_date}
                    onChange={(e) => updateCertification(index, 'issue_date', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                  <input
                    type="date"
                    placeholder="Fecha de expiración"
                    value={cert.expiration_date}
                    onChange={(e) => updateCertification(index, 'expiration_date', e.target.value)}
                    className="px-md py-xs border border-gray-1 rounded bg-black-2 text-white placeholder-gray-4 focus:ring-1 focus:ring-red focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={() => removeCertification(index)}
                  className="w-full px-md py-xs text-red hover:bg-red/10 rounded transition flex items-center justify-center gap-xs text-sm"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            ))}
            <button
              onClick={addCertification}
              className="w-full px-md py-xs border-2 border-dashed border-gray-1 text-gray-4 rounded hover:border-red hover:text-red transition flex items-center justify-center gap-xs text-sm"
            >
              <Plus size={16} /> Agregar Certificación
            </button>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="p-lg bg-black border-t border-gray-1">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-lg py-md bg-red text-white rounded hover:bg-red/80 disabled:opacity-50 transition flex items-center justify-center gap-md font-semibold text-sm"
        >
          <Save size={16} />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
