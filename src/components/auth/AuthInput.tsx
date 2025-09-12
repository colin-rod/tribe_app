'use client'

interface AuthInputProps {
  id: string
  name: string
  type: string
  label: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  minLength?: number
  helpText?: string
}

export default function AuthInput({
  id,
  name,
  type,
  label,
  placeholder,
  value,
  onChange,
  required = false,
  minLength,
  helpText
}: AuthInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-bark-400 mb-2">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        minLength={minLength}
        className="block w-full px-4 py-3 border-2 border-bark-200 rounded-lg shadow-sm placeholder-bark-300 focus:outline-none focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 bg-surface text-bark-400 font-medium transition-colors"
        placeholder={placeholder}
      />
      {helpText && (
        <p className="mt-2 text-xs text-bark-300">
          {helpText}
        </p>
      )}
    </div>
  )
}