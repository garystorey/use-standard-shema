import { useState, useCallback, FormEvent, FocusEvent, useMemo } from "react"
import { SchemaField, SchemaMap, DotPaths } from "./types"
import { flattenDefaults, flattenSchema, defineSchema } from "./helpers"

export type { FormValues, SchemaMap } from "./types"

function useStandardSchema<T extends SchemaMap>(schemaMap: T) {
  type FieldKey = DotPaths<T>
  type FormValues = Record<string, string>
  type Flags = Record<string, boolean>
  type Errors = Record<string, string>

  const flatSchemaMap = useMemo(() => flattenSchema(schemaMap), [schemaMap]) as Record<string, SchemaField>
  const initialValues = useMemo(() => flattenDefaults(schemaMap), [schemaMap])

  const [data, setData] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Flags>({})
  const [dirty, setDirty] = useState<Flags>({})

  async function validateField(field: string, value: string) {
    const schema = flatSchemaMap[field]
    const result = await schema.schema["~standard"].validate(value)
    const message = result?.issues?.[0]?.message ?? ""
    setErrors((prev) => ({ ...prev, [field]: message }))
  }

  async function validateForm() {
    const newErrors: Errors = {}
    await Promise.all(
      Object.keys(flatSchemaMap).map(async (key) => {
        const result = await flatSchemaMap[key].schema["~standard"].validate(data[key])
        newErrors[key] = result?.issues?.[0]?.message ?? ""
      }),
    )
    setErrors(newErrors)
  }

  async function validate(name?: FieldKey) {
    if (name) {
      await validateField(name, data[name])
    } else {
      await validateForm()
    }
  }

  function resetForm() {
    setData(initialValues)
    setErrors({})
    setTouched({})
    setDirty({})
  }

  const getForm = useCallback(
    (onSubmitHandler: (data: FormValues) => void) => {
      const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const newErrors: Errors = {}

        await Promise.all(
          Object.keys(flatSchemaMap).map(async (key) => {
            const result = await flatSchemaMap[key].schema["~standard"].validate(data[key])
            newErrors[key] = result?.issues?.[0]?.message ?? ""
          }),
        )

        setErrors(newErrors)

        const hasError = Object.values(newErrors).some((msg) => msg !== "")
        if (!hasError) {
          onSubmitHandler(data)
        }
      }
      const onFocus = (e: FocusEvent<HTMLFormElement>) => {
        const field = e.target.name
        if (!field || !(field in flatSchemaMap)) return

        setTouched((prev) => ({ ...prev, [field]: true }))
        setErrors((prev) => ({ ...prev, [field]: "" }))
      }

      const onBlur = async (e: FocusEvent<HTMLFormElement>) => {
        const field = e.target.name
        if (!field || !(field in flatSchemaMap)) return

        const value = e.target.value
        const initial = initialValues[field]
        const isDirty = value !== initial

        setTouched((prev) => ({ ...prev, [field]: true }))
        setData((prev) => ({ ...prev, [field]: value }))

        if (isDirty) {
          setDirty((prev) => ({ ...prev, [field]: true }))
          await validateField(field, value)
        }
      }

      const onReset = () => reset()

      const reset = () => {
        setData(initialValues)
        setErrors({})
        setTouched({})
        setDirty({})
      }

      return { onSubmit, onFocus, onBlur, onReset }
    },
    [flatSchemaMap, data, initialValues, validateField],
  )

  const getField = useCallback(
    (name: FieldKey) => {
      const key = name as string
      const { schema, ...fieldDef } = flatSchemaMap[key]

      return {
        ...fieldDef,
        name: key,
        defaultValue: data[key] ?? "",
        error: errors[key] ?? "",
        touched: !!touched[key],
        dirty: !!dirty[key],
      }
    },
    [flatSchemaMap, data, errors, touched, dirty],
  )

  const setField = useCallback(
    (name: FieldKey, value: string) => {
      setData((prev) => ({ ...prev, [name]: value }))
      setDirty((prev) => ({ ...prev, [name]: true }))
      setTouched((prev) => ({ ...prev, [name]: true }))
      validateField(name, value)
    },
    [validateField],
  )

  return {
    resetForm,
    getForm,
    getField,
    validate,
    setField,
    errors,
    touched,
    dirty,
  }
}

export { useStandardSchema, defineSchema }
