/**
 * Forms Index
 * Central export point for all form utilities and components
 */

// Form store and types
export {
  createFormStore,
  type FormConfig,
  type FormFieldConfig,
  type FormState,
  type FormActions
} from './form-store'

// Form components
export {
  FormProvider,
  useFormContext,
  TextField,
  TextareaField,
  SelectField,
  SubmitButton,
  FormErrors,
  type TextFieldProps,
  type TextareaFieldProps,
  type SelectFieldProps,
  type SubmitButtonProps
} from './form-components'

// Re-export validation utilities for convenience
export {
  ValidationRules,
  ValidationSchemas,
  validateWithSchema
} from '@/lib/errors'

// Form utilities
export const FormUtils = {
  /**
   * Helper to create form from validation schema
   */
  createFormFromSchema: <T extends Record<string, any>>(
    schema: any,
    onSubmit?: (data: T) => Promise<void>,
    options?: {
      validateOnChange?: boolean
      validateOnBlur?: boolean
      initialData?: Partial<T>
    }
  ) => {
    const fields = Object.keys(schema).reduce((acc, key) => {
      acc[key as keyof T] = {
        rules: schema[key],
        initialValue: options?.initialData?.[key as keyof T]
      }
      return acc
    }, {} as { [K in keyof T]: FormFieldConfig<T[K]> })

    return createFormStore({
      fields,
      onSubmit,
      validateOnChange: options?.validateOnChange,
      validateOnBlur: options?.validateOnBlur
    })
  },

  /**
   * Helper to extract form data for API calls
   */
  serializeFormData: <T extends Record<string, any>>(data: T): Record<string, any> => {
    const serialized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== '') {
        serialized[key] = value
      }
    }
    
    return serialized
  },

  /**
   * Helper to reset form with server data
   */
  populateForm: <T extends Record<string, any>>(
    form: FormState<T> & FormActions<T>,
    serverData: Partial<T>
  ) => {
    form.reset(serverData)
  }
}