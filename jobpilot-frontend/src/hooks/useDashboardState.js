import { useState, useCallback } from 'react'

export function useDashboardState() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState('welcome')
  const [cv, setCv] = useState(null)
  const [cvUploaded, setCvUploaded] = useState(false)
  const [jobMatches, setJobMatches] = useState([])
  const [applications, setApplications] = useState([])
  const [showCVEditor, setShowCVEditor] = useState(false)

  // UI State
  const [showChatPanel, setShowChatPanel] = useState(false)
  const [showAllJobs, setShowAllJobs] = useState(false)
  const [editingSkills, setEditingSkills] = useState(false)

  // Loading states
  const [cvUploading, setCvUploading] = useState(false)
  const [savingCV, setSavingCV] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [generateLetterLoading, setGenerateLetterLoading] = useState(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  // Cover letter form
  const [coverLetterForm, setCoverLetterForm] = useState({
    position: '',
    company: '',
    tone: 'formal'
  })
  const [generatedLetter, setGeneratedLetter] = useState('')

  // Skills editing
  const [newSkill, setNewSkill] = useState('')
  const [tempSkills, setTempSkills] = useState([])

  // Filter states
  const [selectedExperienceFilter, setSelectedExperienceFilter] = useState(null)
  const [selectedJobsExperienceFilter, setSelectedJobsExperienceFilter] = useState(null)

  // Reset data
  const resetAll = useCallback(() => {
    setUser(null)
    setStats(null)
    setCv(null)
    setJobMatches([])
    setApplications([])
    setChatMessages([])
  }, [])

  return {
    // User data
    user, setUser,
    stats, setStats,
    cv, setCv,
    cvUploaded, setCvUploaded,

    // View state
    loading, setLoading,
    activeView, setActiveView,
    showOnboarding, setShowOnboarding,
    onboardingStep, setOnboardingStep,

    // Job data
    jobMatches, setJobMatches,
    applications, setApplications,

    // UI toggles
    showChatPanel, setShowChatPanel,
    showCVEditor, setShowCVEditor,
    showAllJobs, setShowAllJobs,
    editingSkills, setEditingSkills,

    // Loading states
    cvUploading, setCvUploading,
    savingCV, setSavingCV,
    chatLoading, setChatLoading,
    generateLetterLoading, setGenerateLetterLoading,

    // Chat
    chatMessages, setChatMessages,
    chatInput, setChatInput,

    // Cover letter
    coverLetterForm, setCoverLetterForm,
    generatedLetter, setGeneratedLetter,

    // Skills
    newSkill, setNewSkill,
    tempSkills, setTempSkills,

    // Filters
    selectedExperienceFilter, setSelectedExperienceFilter,
    selectedJobsExperienceFilter, setSelectedJobsExperienceFilter,

    // Actions
    resetAll
  }
}
