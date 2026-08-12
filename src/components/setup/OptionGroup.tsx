interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

interface OptionGroupProps<T extends string> {
  title: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

export function OptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: OptionGroupProps<T>) {
  return (
    <fieldset className="option-group">
      <legend>{title}</legend>
      <div className="option-grid">
        {options.map((option) => (
          <label
            className={`option-card${value === option.value ? ' option-selected' : ''}`}
            key={option.value}
          >
            <input
              checked={value === option.value}
              name={title}
              onChange={() => onChange(option.value)}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
            {option.description ? <small>{option.description}</small> : null}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
