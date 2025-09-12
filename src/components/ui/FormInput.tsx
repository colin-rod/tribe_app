'use client'

interface FormInputProps {
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
  variant?: 'default' | 'auth'
  className?: string
}

export function FormInput({
  id,
  name,
  type,
  label,
  placeholder,
  value,
  onChange,
  required = false,
  minLength,
  helpText,
  variant = 'default',
  className = ''
}: FormInputProps) {
  const baseInputClasses = "block w-full px-3 py-2 shadow-sm focus:outline-none transition-colors"
  
  const variantClasses = {
    default: "border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500",
    auth: "px-4 py-3 border-2 border-bark-200 rounded-lg placeholder-bark-300 focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 bg-surface text-bark-400 font-medium"
  }

  const labelClasses = variant === 'auth' 
    ? "block text-sm font-medium text-bark-400 mb-2"
    : "block text-sm font-medium text-gray-700"

  const helpTextClasses = variant === 'auth'
    ? "mt-2 text-xs text-bark-300"
    : "mt-2 text-xs text-gray-500"

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClasses}>
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
        className={`${baseInputClasses} ${variantClasses[variant]}`}
        placeholder={placeholder}
      />
      {helpText && (
        <p className={helpTextClasses}>
          {helpText}
        </p>
      )}
    </div>
  )
}

export default FormInput