// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { ChoiceGroup } from './ChoiceGroup';
import { Panel } from './Panel';

// jsdom has no CSS.escape, which user-event needs to walk a radio group with the arrow keys.
beforeAll(() => {
  const escape = (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  Object.defineProperty(window, 'CSS', { value: { escape }, configurable: true });
});

afterEach(cleanup);

describe('Button', () => {
  it('is a native button that activates by click, Enter and Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>New round</Button>);
    const button = screen.getByRole('button', { name: 'New round' });
    expect(button.getAttribute('type')).toBe('button');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled variant="secondary">
        Reset score
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Reset score' });
    expect(button.hasAttribute('disabled')).toBe(true);
    await user.click(button);
    await user.tab();
    await user.keyboard('{Enter} ');
    expect(onClick).not.toHaveBeenCalled();
  });
});

const modes = [
  { value: 'two', label: 'Two players' },
  { value: 'computer', label: 'Against the computer' },
] as const;

type Mode = (typeof modes)[number]['value'];

function Harness({ onChange, disabled = false }: { onChange: (value: Mode) => void; disabled?: boolean }) {
  const [value, setValue] = useState<Mode>('two');
  return (
    <ChoiceGroup
      legend="Mode"
      name="mode"
      options={modes}
      value={value}
      disabled={disabled}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('ChoiceGroup', () => {
  it('exposes a group named by its legend with one radio per option', () => {
    render(<Harness onChange={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Mode' });
    expect(group.tagName).toBe('FIELDSET');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Two players' }).checked).toBe(true);
  });

  it('calls onChange with the option value when an option is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Against the computer' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('computer');
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Against the computer' }).checked).toBe(true);
  });

  it('picks options with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Two players' }));
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('computer');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Against the computer' }));
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('two');
  });

  it('blocks changes when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} disabled />);
    const computer = screen.getByRole<HTMLInputElement>('radio', { name: 'Against the computer' });
    expect(computer.disabled).toBe(true);
    await user.click(computer);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Panel', () => {
  it('renders its title as a heading above its content', () => {
    render(
      <Panel title="Setup">
        <p>Body</p>
      </Panel>,
    );
    expect(screen.getByRole('heading', { name: 'Setup' })).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('renders without a heading when no title is given', () => {
    render(
      <Panel>
        <p>Body</p>
      </Panel>,
    );
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
