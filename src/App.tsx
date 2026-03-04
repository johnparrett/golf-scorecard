import { useState, useEffect, useRef } from 'react'
import './App.css'

type SetupState = {
  golfers: string[]
  holesCount: number
}

type GolferData = {
  id: string
  name: string
  isEditing: boolean
}

type HoleScore = {
  par: number
  scores: Record<string, number | ''> // golferName -> score (number or blank)
}

const STORAGE_KEY = 'golf-scorecard-state'
const MAX_OUTLINES = 2
const MAX_DISPLAY_SCORE = 10

function App() {
  const [setup, setSetup] = useState<SetupState | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).setup : null
  })
  const [golfers, setGolfers] = useState<GolferData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).golfers : [{ id: Math.random().toString(), name: '', isEditing: true }]
  })
  const [holesCount, setHolesCount] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).holesCount : 9
  })
  
  const [currentHole, setCurrentHole] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).currentHole : 1
  })
  const [roundScores, setRoundScores] = useState<HoleScore[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).roundScores : []
  })
  const [currentPar, setCurrentPar] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).currentPar : 0
  })
  const [currentHoleScores, setCurrentHoleScores] = useState<Record<string, number | ''>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).currentHoleScores : {}
  })
  const [completedHolesCount, setCompletedHolesCount] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).completedHolesCount : 0
  })
  const [isEditingHole, setIsEditingHole] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).isEditingHole : true
  })
  const [showScorecard, setShowScorecard] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved).showScorecard : false
  })

  // Mobile keypad state
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [keypadTarget, setKeypadTarget] = useState<string | null>(null)

  useEffect(() => {
    const state = {
      setup,
      golfers,
      holesCount,
      currentHole,
      roundScores,
      currentPar,
      currentHoleScores,
      completedHolesCount,
      isEditingHole,
      showScorecard
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [setup, golfers, holesCount, currentHole, roundScores, currentPar, currentHoleScores, completedHolesCount, isEditingHole, showScorecard])

  useEffect(() => {
    const detectMobileDevice = () => {
      try {
        if (typeof navigator === 'undefined') return false
        const ua = navigator.userAgent || ''
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      } catch {
        return false
      }
    }
    setIsMobile(detectMobileDevice())
  }, [])

  useEffect(() => {
    try {
      if (isMobile) document.body.classList.add('is-mobile-device')
      else document.body.classList.remove('is-mobile-device')
    } catch (e) {}
  }, [isMobile])

  const closeKeypad = () => setKeypadTarget(null)

  const handleKeypadPress = (key: string) => {
    if (!keypadTarget) return
    setCurrentHoleScores(prev => {
      const prevVal = prev[keypadTarget]
      let str = typeof prevVal === 'number' ? String(prevVal) : (prevVal || '')

      if (key === 'DEL') {
        str = str.slice(0, -1)
      } else {
        // append digit
        // avoid leading zeros
        if (str === '0') str = key
        else str = str + key
      }

      // compute numeric value and clamp
      if (str === '') return { ...prev, [keypadTarget]: '' }
      const parsed = parseInt(str || '0', 10)
      const maxScorePossible = currentPar > 0 ? Math.min(currentPar * 2, MAX_DISPLAY_SCORE) : MAX_DISPLAY_SCORE
      const clamped = Math.max(0, Math.min(parsed, maxScorePossible))
      return { ...prev, [keypadTarget]: clamped }
    })
  }

  const handleAddGolfer = () => {
    setGolfers(prev => [
      ...prev.map(g => g.name.trim() ? { ...g, isEditing: false } : g),
      { id: Math.random().toString(), name: '', isEditing: true }
    ])
  }

  const handleUpdateName = (id: string, name: string) => {
    setGolfers(golfers.map(g => g.id === id ? { ...g, name } : g))
  }

  const previousNames = useRef<Record<string, string>>({})

  const isValidName = (name: string) => {
    const t = name.trim()
    if (!t) return false
    return /^[A-Za-z ]+$/.test(t)
  }

  const handleNameFocus = (id: string) => {
    const g = golfers.find(x => x.id === id)
    previousNames.current[id] = g?.name || ''
  }

  const handleNameBlur = (id: string) => {
    const g = golfers.find(x => x.id === id)
    const name = g?.name || ''
    if (!isValidName(name)) {
      window.alert('Invalid name. Please enter letters and spaces only.')
      // revert to previous valid name (or empty)
      const prev = previousNames.current[id] || ''
      setGolfers(prevList => prevList.map(p => p.id === id ? { ...p, name: prev } : p))
    } else {
      // trim whitespace and save
      const trimmed = name.trim()
      setGolfers(prevList => prevList.map(p => p.id === id ? { ...p, name: trimmed } : p))
    }
  }

  const handleDelete = (id: string) => {
    setGolfers(golfers.filter(g => g.id !== id))
  }

  const handleStartRound = () => {
    setSetup({ golfers: golfers.map(g => g.name), holesCount })
    const initialScores: Record<string, number | ''> = {}
    golfers.forEach(g => initialScores[g.name] = '')
    setCurrentHoleScores(initialScores)
    setCompletedHolesCount(0)
    setIsEditingHole(true)
  }

  const getSortedGolfers = () => {
    if (!setup) return []
    if (currentHole === 1) return setup.golfers

    const lastHoleScores = roundScores[currentHole - 2]?.scores
    if (!lastHoleScores) return setup.golfers

    return [...setup.golfers].sort((a, b) => {
      const scoreA = lastHoleScores[a] || 0
      const scoreB = lastHoleScores[b] || 0
      return scoreA - scoreB
    })
  }

  const handleNextHole = () => {
    const newRoundScores = [...roundScores]
    newRoundScores[currentHole - 1] = { par: currentPar, scores: { ...currentHoleScores } }
    setRoundScores(newRoundScores)
    
    const newCompletedCount = Math.max(completedHolesCount, currentHole)
    setCompletedHolesCount(newCompletedCount)
    
    if (currentHole < (setup?.holesCount || 9)) {
      const nextHole = currentHole + 1
      setCurrentHole(nextHole)
      
      const nextHoleData = newRoundScores[nextHole - 1]
      if (nextHoleData) {
        setCurrentPar(nextHoleData.par)
        setCurrentHoleScores(nextHoleData.scores)
        setIsEditingHole(nextHole > newCompletedCount)
      } else {
        setCurrentPar(0)
        const nextScores: Record<string, number | ''> = {}
        setup?.golfers.forEach(name => nextScores[name] = '')
        setCurrentHoleScores(nextScores)
        setIsEditingHole(true)
      }
    } else {
      setShowScorecard(true)
    }
  }

  const handlePrevHole = () => {
    if (currentHole > 1) {
      // Save current progress before going back
      const newRoundScores = [...roundScores]
      newRoundScores[currentHole - 1] = { par: currentPar, scores: { ...currentHoleScores } }
      setRoundScores(newRoundScores)

      const prevHole = currentHole - 1
      setCurrentHole(prevHole)
      
      const prevHoleData = newRoundScores[prevHole - 1]
      if (prevHoleData) {
        setCurrentPar(prevHoleData.par)
        setCurrentHoleScores(prevHoleData.scores)
        setIsEditingHole(prevHole > completedHolesCount)
      }
    }
  }

  const handleRequestEdit = () => {
    if (window.confirm('Are you sure you want to edit this hole?')) {
      setIsEditingHole(true)
    }
  }

  const saveCurrentHole = () => {
    let p = currentPar;
    if (p > 5) {
      p = 5;
      setCurrentPar(5);
    }
    if (p < 0) {
      p = 0;
      setCurrentPar(0);
    }

    const s = { ...currentHoleScores };
    let changed = false;
    Object.keys(s).forEach(name => {
      const val = s[name]
      const max = p * 2;
      if (typeof val === 'number') {
        if (p > 0 && val > max) {
          s[name] = max;
          changed = true;
        }
        if (val < 1) {
          s[name] = 1;
          changed = true;
        }
      }
    });

    if (changed) {
      setCurrentHoleScores(s);
    }

    setRoundScores(prev => {
      const newScores = [...prev]
      newScores[currentHole - 1] = { par: p, scores: s }
      return newScores
    })
  }

  const handleRestart = () => {
    if (window.confirm('Are you sure you want to start over? All current progress will be lost.')) {
      setSetup(null)
      setRoundScores([])
      setCurrentHole(1)
      setCurrentPar(0)
      setCurrentHoleScores({})
      setCompletedHolesCount(0)
      setShowScorecard(false)
    }
  }

  const renderScore = (score: number | '' | undefined, par: number) => {
    if (!par) return score || '-'
    if (score === '' || score === undefined) return '-'

    let s = score as number
    if (s <= 0) s = 1

    // clamp displayable score to the maximum allowed by par and absolute max
    const maxScorePossible = par > 0 ? Math.min(par * 2, MAX_DISPLAY_SCORE) : MAX_DISPLAY_SCORE
    if (s > maxScorePossible) s = maxScorePossible

    if (s === 1) return <span className="score-star">{s}</span>

    const diff = s - par

    if (diff < 0) {
      const numCircles = Math.min(-diff, MAX_OUTLINES) // cap circles to MAX_OUTLINES
      let result: any = <span style={{ padding: '0 2px' }}>{s}</span>
      for (let i = 0; i < numCircles; i++) {
        result = <span className="score-circle" key={i}>{result}</span>
      }
      return result
    }

    if (diff === 0) return s

    // Bogeys/over par: One square per stroke over par, max squares = par (reaches double par)
    if (diff > 0) {
      const numSquares = Math.min(diff, MAX_OUTLINES) // cap outlines to MAX_OUTLINES
      let result: any = <span style={{ padding: '0 2px' }}>{s}</span>
      for (let i = 0; i < numSquares; i++) {
        result = <span className="score-square" key={i}>{result}</span>
      }
      return result
    }

    return s
  }

  if (showScorecard && setup) {
    return (
      <div className="container scorecard-view">
        <h1>Full Scorecard</h1>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Hole</th>
                {Array.from({ length: setup.holesCount }).map((_, i) => (
                  <th key={i}>{i + 1}</th>
                ))}
                <th>Total</th>
              </tr>
              <tr>
                <th>Par</th>
                {Array.from({ length: setup.holesCount }).map((_, i) => (
                  <th key={i}>{roundScores[i]?.par || '-'}</th>
                ))}
                <th>{roundScores.reduce((acc, h) => acc + (h.par || 0), 0)}</th>
              </tr>
            </thead>
            <tbody>
              {setup.golfers.map(name => {
                const total = roundScores.reduce((acc, h) => acc + (h.scores[name] || 0), 0)
                return (
                  <tr key={name}>
                    <td className="golfer-name-cell">{name}</td>
                    {Array.from({ length: setup.holesCount }).map((_, i) => {
                      const score = roundScores[i]?.scores[name]
                      const par = roundScores[i]?.par
                      return (
                        <td key={i}>
                          {renderScore(score || 0, par || 0)}
                        </td>
                      )
                    })}
                    <td className="total-cell">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="action-buttons">
          <button onClick={() => setShowScorecard(false)}>Back to Hole</button>
          <button onClick={handleRestart} className="delete-btn" style={{ marginLeft: '10px' }}>
            Restart Round
          </button>
        </div>
      </div>
    )
  }

  if (setup) {
    const sortedGolfers = getSortedGolfers()
    
    return (
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Hole {currentHole}</h1>
          {!isEditingHole && (
            <button onClick={handleRequestEdit} className="secondary-btn">Edit Hole</button>
          )}
        </div>
        
        <div className="setup-section">
          <label htmlFor="par-input">Par </label>
          <select
            id="par-input"
            value={currentPar || ''}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              setCurrentPar(Number.isNaN(v) ? 0 : Math.max(0, Math.min(5, v)))
            }}
            onBlur={saveCurrentHole}
            disabled={!isEditingHole}
          >
            <option value="">Set par</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
        
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {sortedGolfers.map((name) => (
            <li key={name} className="golfer-score-row" style={{ marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{name}</div>
              <label htmlFor={`${name}-score`}>Score </label>
              <input
                id={`${name}-score`}
                type="number"
                min={1}
                max={currentPar > 0 ? currentPar * 2 : undefined}
                value={currentHoleScores[name] ?? ''}
                onChange={(e) => setCurrentHoleScores({
                  ...currentHoleScores,
                  [name]: e.target.value === '' ? '' : parseInt(e.target.value)
                })}
                onBlur={saveCurrentHole}
                title={!currentPar && isEditingHole ? 'Set the hole par to enable scoring' : undefined}
                disabled={!isEditingHole || !currentPar}
                readOnly={isMobile}
                onFocus={() => { if (isMobile && isEditingHole && currentPar) setKeypadTarget(name) }}
                onClick={() => { if (isMobile && isEditingHole && currentPar) setKeypadTarget(name) }}
              />
              {!currentPar && isEditingHole && (
                <button
                  type="button"
                  className="input-helper-icon"
                  title="Enable scoring (set hole value first)"
                  aria-label="Enable scoring"
                  onClick={() => {
                    const el = document.getElementById('par-input') as HTMLElement | null
                    if (el) el.focus()
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <circle cx="12" cy="16" r="1"></circle>
                  </svg>
                </button>
              )}
              {(() => {
                const raw = currentHoleScores[name]
                let displayNum: number | null = null
                if (typeof raw === 'number') {
                  const maxScorePossible = currentPar > 0 ? Math.min(currentPar * 2, MAX_DISPLAY_SCORE) : MAX_DISPLAY_SCORE
                  displayNum = Math.min(raw, maxScorePossible)
                }
                const wide = displayNum !== null && displayNum >= 10
                return (
                  <span className={`symbol${wide ? ' wide' : ''}`}>
                    {renderScore(currentHoleScores[name], currentPar)}
                  </span>
                )
              })()}
            </li>
          ))}
        </ul>

        {keypadTarget && (
          <div className="keypad-backdrop" onClick={closeKeypad}>
            <div className="mobile-keypad" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="keypad-grid">
                {['1','2','3','4','5','6','7','8','9'].map(d => (
                  <button key={d} className="keypad-btn" onClick={() => handleKeypadPress(d)} aria-label={`Digit ${d}`}>{d}</button>
                ))}
                <button className="keypad-btn delete" onClick={() => handleKeypadPress('DEL')} aria-label="Delete">⌫</button>
                <button className="keypad-btn" onClick={() => handleKeypadPress('0')} aria-label="Digit 0">0</button>
                <button className="keypad-btn close" onClick={closeKeypad} aria-label="Close keypad">✕</button>
              </div>
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button onClick={handlePrevHole} disabled={currentHole === 1} className="secondary-btn">
            Previous Hole
          </button>
          <button 
            onClick={handleNextHole} 
            disabled={!currentPar || (currentHole > roundScores.length && !isEditingHole)} 
            style={{ marginLeft: '10px' }}
          >
            {currentHole === setup.holesCount ? 'Finish Round' : 'Next Hole'}
          </button>
          <button onClick={() => {
            saveCurrentHole();
            setShowScorecard(true);
          }} className="secondary-btn" style={{ marginLeft: '10px' }}>
            View Full Scorecard
          </button>
        </div>
      </div>
    )
  }

  const canStartRound = golfers.length > 0 && golfers.every(g => isValidName(g.name))

  return (
    <div className="container">
      <h1>Golf Scorecard Setup</h1>
      
      <div className="setup-section">
        <h3>Golfers</h3>
        {golfers.map((golfer) => (
          <div key={golfer.id} className="golfer-setup-item">
            <input
              type="text"
              placeholder="Golfer Name"
              value={golfer.name}
              onChange={(e) => handleUpdateName(golfer.id, e.target.value)}
              onFocus={() => handleNameFocus(golfer.id)}
              onBlur={() => handleNameBlur(golfer.id)}
            />
            <button onClick={() => handleDelete(golfer.id)} className="delete-btn">Delete</button>
          </div>
        ))}
        <button onClick={handleAddGolfer}>Add Golfer</button>
      </div>

      <div className="setup-section">
        <h3>Holes</h3>
        <label>
          <input
            type="radio"
            name="holes"
            value="9"
            checked={holesCount === 9}
            onChange={() => setHolesCount(9)}
          /> 9 Holes
        </label>
        <label>
          <input
            type="radio"
            name="holes"
            value="18"
            checked={holesCount === 18}
            onChange={() => setHolesCount(18)}
          /> 18 Holes
        </label>
      </div>

      <button onClick={handleStartRound} disabled={!canStartRound}>
        Start Round
      </button>
    </div>
  )
}

export default App
