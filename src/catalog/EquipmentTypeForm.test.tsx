import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { INITIAL_SETTINGS } from '../core/scene'
import { EquipmentTypeForm } from './EquipmentTypeForm'
import { EQUIPMENT_TEMPLATES } from './templates'
import { draftFromTemplate } from './typeDraft'

const DIMENSION_ERROR = 'Vnesi mero v mm (celo število, večje od 0).'

function renderForm(onSave = vi.fn().mockResolvedValue(true)) {
  const cylinder = EQUIPMENT_TEMPLATES.find((t) => t.key === 'cylinder')!
  render(
    <EquipmentTypeForm
      title="Nov tip"
      initial={draftFromTemplate(cylinder, 'id-1')}
      systems={INITIAL_SETTINGS.systems}
      onSave={onSave}
      onCancel={() => {}}
    />,
  )
  return onSave
}

describe('EquipmentTypeForm', () => {
  it('does not save without dimensions and marks the empty fields', async () => {
    const onSave = renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Shrani tip' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getAllByText(DIMENSION_ERROR)).toHaveLength(2)
  })

  it('hides the error of a field as soon as the field is edited', async () => {
    renderForm()
    await userEvent.click(screen.getByRole('button', { name: 'Shrani tip' }))
    await userEvent.type(screen.getByLabelText('Premer'), '600')
    expect(screen.getAllByText(DIMENSION_ERROR)).toHaveLength(1)
    expect(screen.getByLabelText('Premer')).not.toHaveAttribute('aria-invalid')
    await userEvent.type(screen.getByLabelText('Višina'), '1600')
    expect(screen.queryByText(DIMENSION_ERROR)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('saves the type once the dimensions are entered', async () => {
    const onSave = renderForm()
    await userEvent.type(screen.getByLabelText('Premer'), '600')
    await userEvent.type(screen.getByLabelText('Višina'), '1600')
    await userEvent.click(screen.getByRole('button', { name: 'Shrani tip' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Hranilnik',
        tagPrefix: 'CYL',
        shape: { kind: 'cylinder', diameter: 600, height: 1600 },
      }),
    )
  })
})
