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
  index?: string
}

export function OptionGroup<T extends string>({
  title,
  options,
  value,
  onChange,
  index,
}: OptionGroupProps<T>) {
  return (
    <fieldset className="setup-step option-group">
      <legend>
        {index ? <span className="setup-step-index">{index}</span> : null}
        <span className="setup-step-title">{title}</span>
      </legend>
      <div className="option-grid">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <label
              className={`option-card${selected ? ' option-selected' : ''}`}
              key={option.value}
            >
              <input
                checked={selected}
                name={title}
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
              {option.description ? <small>{option.description}</small> : null}
              <span className="option-radio" aria-hidden="true" />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}