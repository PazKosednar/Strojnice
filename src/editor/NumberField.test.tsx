import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NumberField } from './NumberField'

describe('NumberField', () => {
  it('commits an integer on Enter', async () => {
    const onCommit = vi.fn().mockReturnValue(true)
    render(<NumberField label="Dolžina" value={3200} onCommit={onCommit} />)
    const input = screen.getByLabelText('Dolžina')
    await userEvent.clear(input)
    await userEvent.type(input, '2400{Enter}')
    expect(onCommit).toHaveBeenCalledWith(2400)
  })

  it('reverts when the value is rejected or not a number', async () => {
    const onCommit = vi.fn().mockReturnValue(false)
    render(<NumberField label="Dolžina" value={3200} onCommit={onCommit} />)
    const input = screen.getByLabelText('Dolžina')
    await userEvent.clear(input)
    await userEvent.type(input, '0{Enter}')
    expect(input).toHaveValue('3200')

    await userEvent.clear(input)
    await userEvent.type(input, 'abc{Enter}')
    expect(input).toHaveValue('3200')
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('does not commit an unchanged value', async () => {
    const onCommit = vi.fn().mockReturnValue(true)
    render(<NumberField label="Dolžina" value={3200} onCommit={onCommit} />)
    await userEvent.type(screen.getByLabelText('Dolžina'), '{Enter}')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('shows a new value from the model', () => {
    const { rerender } = render(<NumberField label="Dolžina" value={3200} onCommit={() => true} />)
    rerender(<NumberField label="Dolžina" value={1500} onCommit={() => true} />)
    expect(screen.getByLabelText('Dolžina')).toHaveValue('1500')
  })

  it('clears an optional value when the field is emptied', async () => {
    const onCommit = vi.fn().mockReturnValue(true)
    const onClear = vi.fn().mockReturnValue(true)
    render(<NumberField label="Razmik" value={300} onCommit={onCommit} onClear={onClear} />)
    await userEvent.clear(screen.getByLabelText('Razmik'))
    await userEvent.type(screen.getByLabelText('Razmik'), '{Enter}')
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onCommit).not.toHaveBeenCalled()
  })
})
