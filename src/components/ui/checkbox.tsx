import React from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({ 
  checked = false, 
  onCheckedChange, 
  className = '', 
  ...props 
}: CheckboxProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked)
    props.onChange?.(e)
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      className={`
        h-4 w-4 text-blue-600 rounded border-gray-300 
        focus:ring-blue-500 focus:ring-2
        ${className}
      `.trim()}
      {...props}
    />
  )
}