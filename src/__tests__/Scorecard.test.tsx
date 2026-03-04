import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { describe, it, expect, beforeEach } from 'vitest'

describe('Scorecard Setup', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('allows setting up golfers and number of holes', async () => {
    render(<App />)
    
    // Check initial setup screen
    expect(screen.getByText(/Golf Scorecard Setup/i)).toBeInTheDocument()
    
    // Add golfers - autosave on blur (no Save/Edit buttons)
    const nameInput = screen.getByPlaceholderText(/Golfer Name/i)
    fireEvent.change(nameInput, { target: { value: 'Alice' } })
    fireEvent.blur(nameInput)

    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()

    // Add another and delete it
    fireEvent.click(screen.getByText(/Add Golfer/i))
    const nameInputs = screen.getAllByPlaceholderText(/Golfer Name/i)
    // enter Bob into the newly added input (last)
    const bobInput = nameInputs[nameInputs.length - 1]
    fireEvent.change(bobInput, { target: { value: 'Bob' } })
    fireEvent.blur(bobInput)
    const deleteBtns = screen.getAllByText(/Delete/i)
    fireEvent.click(deleteBtns[1]) // Delete the Bob one
    expect(screen.queryByDisplayValue('Bob')).not.toBeInTheDocument()

    // Add Bob back
    fireEvent.click(screen.getByText(/Add Golfer/i))
    const newInputs = screen.getAllByPlaceholderText(/Golfer Name/i)
    const newBobInput = newInputs[newInputs.length - 1]
    fireEvent.change(newBobInput, { target: { value: 'Bob' } })
    fireEvent.blur(newBobInput)

    // Edit Alice in-place and autosave
    const aliceInput = screen.getByDisplayValue('Alice')
    fireEvent.change(aliceInput, { target: { value: 'Alicia' } })
    fireEvent.blur(aliceInput)
    expect(screen.getByDisplayValue('Alicia')).toBeInTheDocument()
    
    // Select holes
    const holes9Btn = screen.getByLabelText(/9 Holes/i)
    fireEvent.click(holes9Btn)
    
    // Start Round
    const startBtn = screen.getByText(/Start Round/i)
    fireEvent.click(startBtn)
    
    // Should transition to first hole
    expect(screen.getByText(/Hole 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Alicia/i)).toBeInTheDocument()
    expect(screen.getByText(/Bob/i)).toBeInTheDocument()
  })

  it('allows setting par and entering scores', async () => {
    render(<App />)
    
    // Setup
    const aliceInput = screen.getByPlaceholderText(/Golfer Name/i)
    fireEvent.change(aliceInput, { target: { value: 'Alice' } })
    fireEvent.blur(aliceInput)

    fireEvent.click(screen.getByText(/Add Golfer/i))
    const nameInputs = screen.getAllByPlaceholderText(/Golfer Name/i)
    const bobInput = nameInputs[nameInputs.length - 1]
    fireEvent.change(bobInput, { target: { value: 'Bob' } })
    fireEvent.blur(bobInput)

    fireEvent.click(screen.getByText(/Start Round/i))

    // Hole 1 Par
    const parInput = screen.getByLabelText(/Par/i)
    fireEvent.change(parInput, { target: { value: '4' } })

    // Scores for Hole 1
    const scores = screen.getAllByLabelText(/Score/i)
    // Alicia and Bob are in the list. Based on setup order or sort logic.
    // In Hole 1, they are in setup order: Alice, then Bob.
    fireEvent.change(scores[0], { target: { value: '3' } }) // Alice: Birdie
    fireEvent.change(scores[1], { target: { value: '5' } }) // Bob: Bogey
    
    fireEvent.click(screen.getByText(/Next Hole/i))
    
    // View Scorecard
    fireEvent.click(screen.getByText(/View Full Scorecard/i))
    expect(screen.getByText(/Full Scorecard/i)).toBeInTheDocument()
    
    // Check styles in scorecard table (Alice: 3 on Par 4 = Birdie - score-circle)
    const aliceScoreCell = screen.getAllByRole('cell').find(cell => cell.textContent === '3')
    expect(aliceScoreCell?.querySelector('.score-circle')).toBeInTheDocument()
    
    const bobScoreCell = screen.getAllByRole('cell').find(cell => cell.textContent === '5')
    expect(bobScoreCell?.querySelector('.score-square')).toBeInTheDocument()
    
    // Back to game
    fireEvent.click(screen.getByText(/Back to Hole/i))
    expect(screen.getByText(/Hole 2/i)).toBeInTheDocument()
  })
})
