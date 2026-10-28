// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaveResultForm } from './SaveResultForm';
import type { SaveStatus } from './usePendingResult';

afterEach(cleanup);

function setup(status: SaveStatus = 'idle', initialNickname = '') {
  const onSave = vi.fn();
  render(<SaveResultForm outcome="win" status={status} initialNickname={initialNickname} onSave={onSave} />);
  return { onSave, user: userEvent.setup() };
}

const input = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Nickname' });

describe('SaveResultForm', () => {
  it('empty nickname shows message and does not call onSave', async () => {
    const { onSave, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a nickname to save.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the rule for an invalid nickname', async () => {
    const { onSave, user } = setup();
    await user.type(input(), 'a<b');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Use 1 to 16 letters, digits, spaces, _ or -.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('pre-fills initial nickname and saves a typed different one', async () => {
    const { onSave, user } = setup('idle', 'Ann');
    expect(input().value).toBe('Ann');
    await user.clear(input());
    await user.type(input(), ' Bob ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith('Bob');
  });

  it('saves the pre-filled nickname with Enter', async () => {
    const { onSave, user } = setup('idle', 'Ann');
    await user.type(input(), '{Enter}');
    expect(onSave).toHaveBeenCalledExactlyOnceWith('Ann');
  });

  it.each([
    ['unreachable' as const, 'Cannot reach the server.'],
    ['rate-limited' as const, 'Too many saves, try again later.'],
  ])('%s shows message and Retry', async (status, message) => {
    const { onSave, user } = setup(status, 'Ann');
    expect(screen.getByText(message)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith('Ann');
  });

  it('rejected shows message without Retry', () => {
    setup('rejected', 'Ann');
    expect(screen.getByText('The server did not accept this result.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('saved shows confirmation and no input', () => {
    setup('saved', 'Ann');
    expect(screen.getByText('Result saved.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('disables Save while saving', () => {
    setup('saving', 'Ann');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled).toBe(true);
  });
});
