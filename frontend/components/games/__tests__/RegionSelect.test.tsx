import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegionSelect } from '../RegionSelect';

describe('RegionSelect', () => {
  it('mevcut değeri seçili gösterir', () => {
    render(<RegionSelect value="US" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('US');
  });

  it('değişince yeni ülke kodunu onChange ile verir', async () => {
    const onChange = vi.fn();
    render(<RegionSelect value="TR" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'DE');
    expect(onChange).toHaveBeenCalledWith('DE');
  });
});
