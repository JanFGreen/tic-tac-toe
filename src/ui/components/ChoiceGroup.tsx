import './components.css';

interface ChoiceGroupProps<T extends string> {
  legend: string;
  name: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled = false,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset className="choice-group" disabled={disabled}>
      <legend className="choice-legend">{legend}</legend>
      <div className="choice-options">
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input
              className="choice-input"
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={disabled}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className="choice-label">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
