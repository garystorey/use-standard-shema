import { type FocusEvent, type FormEvent, useCallback, useMemo, useState } from "react"
import { defineForm, flattenDefaults, flattenFormDefinition, toFormData } from "./helpers"
import type {
	DotPaths,
	ErrorEntry,
	Errors,
	FieldDefinition,
	Flags,
	FormDefinition,
	FormValues,
	TypeFromDefinition,
} from "./types"

/**
 * Custom hook to manage form state based on a form definition.
 * @param formDefinition - The form definition.
 * @returns An object containing methods and state for managing the form.
 */
function useStandardSchema<T extends FormDefinition>(formDefinition: T) {
	type FieldKey = DotPaths<T>

	// Derived data
	const flatFormDefinition = useMemo(() => flattenFormDefinition(formDefinition), [formDefinition]) as Record<
		string,
		FieldDefinition
	>

	const initialValues = useMemo(() => flattenDefaults(formDefinition), [formDefinition])

	const formDefinitionKeys = useMemo(() => Object.keys(flatFormDefinition), [flatFormDefinition])

	// State
	const [data, setData] = useState<FormValues>(initialValues)
	const [errors, setErrors] = useState<Errors>({})
	const [touched, setTouched] = useState<Flags>({})
	const [dirty, setDirty] = useState<Flags>({})

	// --- Pure per-field validator (no state updates)
	const validateFieldValue = useCallback(
		async (field: string, value: string): Promise<string> => {
			const fieldDef = flatFormDefinition[field]
			const result = await fieldDef.validate["~standard"].validate(value)
			return result?.issues?.[0]?.message ?? ""
		},
		[flatFormDefinition],
	)

	// --- Single-field validate (updates state for that field)
	const validateField = useCallback(
		async (field: string, value: string) => {
			const message = await validateFieldValue(field, value)
			setErrors((prev) => ({ ...prev, [field]: message }))
			return message === ""
		},
		[validateFieldValue],
	)

	// --- Full-form validate (batch state update, no flicker)
	const validateForm = useCallback(async () => {
		const newErrors: Errors = {}

		await Promise.all(
			formDefinitionKeys.map(async (key) => {
				newErrors[key] = await validateFieldValue(key, data[key])
			}),
		)

		setErrors(newErrors)
		return Object.values(newErrors).every((msg) => msg === "")
	}, [formDefinitionKeys, data, validateFieldValue])

	const validate = useCallback(
		async (name?: FieldKey) => {
			if (name) {
				const key = name as string
				return validateField(key, data[key])
			}
			return validateForm()
		},
		[data, validateField, validateForm],
	)

	const resetForm = useCallback(() => {
		setData(initialValues)
		setErrors({})
		setTouched({})
		setDirty({})
	}, [initialValues])

	const getForm = useCallback(
		(onSubmitHandler: (data: TypeFromDefinition<typeof formDefinition>) => void) => {
			const onSubmit = async (e: FormEvent) => {
				const formEl = e.currentTarget as HTMLFormElement
				e.preventDefault()
				const isValid = await validate()
				if (isValid) {
					onSubmitHandler(data as TypeFromDefinition<typeof formDefinition>)
					resetForm()
					formEl.reset()
				}
			}

			const onFocus = (e: FocusEvent<HTMLFormElement>) => {
				const field = e.target.name
				if (!field || !(field in flatFormDefinition)) return

				setTouched((prev) => ({ ...prev, [field]: true }))
				setErrors((prev) => ({ ...prev, [field]: "" }))
			}

			const onBlur = async (e: FocusEvent<HTMLFormElement>) => {
				const field = e.target.name
				if (!field || !(field in flatFormDefinition)) return

				const value = e.target.value
				const initial = (initialValues as Record<string, unknown>)[field]
				const isDirty = value !== initial

				setTouched((prev) => ({ ...prev, [field]: true }))
				setData((prev) => ({ ...prev, [field]: value }))

				if (isDirty) {
					setDirty((prev) => ({ ...prev, [field]: true }))
					await validateField(field, value)
				}
			}

			const onReset = () => resetForm()

			return { onSubmit, onFocus, onBlur, onReset }
		},
		[flatFormDefinition, data, initialValues, resetForm, validateField, validate],
	)

	const getField = useCallback(
		(name: FieldKey) => {
			const key = name as string

			const def = flatFormDefinition[key]
			if (!def) {
				throw new Error(`Field "${key}" does not exist in the form definition.`)
			}

			const { validate: _validate, ...fieldDef } = def
			const describedById = `${key}-description`
			const errorId = `${key}-error`

			return {
				...fieldDef,
				name: key,
				defaultValue: data[key] ?? "",
				error: errors[key] ?? "",
				touched: touched[key] ? String(touched[key]) : "false",
				dirty: dirty[key] ? String(dirty[key]) : "false",
				describedById,
				errorId,
			}
		},
		[flatFormDefinition, data, errors, touched, dirty],
	)

	const setField = useCallback(
		async (name: FieldKey, value: string) => {
			const field = name as string
			const ok = await validateField(field, value)
			if (ok) setData((prev) => ({ ...prev, [field]: value }))
			setTouched((prev) => ({ ...prev, [field]: true }))
			setDirty((prev) => ({ ...prev, [field]: true }))
		},
		[validateField],
	)

	const getErrors = useCallback(
		(name?: FieldKey): ErrorEntry[] => {
			if (name) {
				const error = errors[name]
				if (!error) return []
				return [
					{
						name,
						error,
						label: flatFormDefinition[name]?.label,
					},
				]
			}

			const errorEntries: ErrorEntry[] = []
			for (const key of formDefinitionKeys) {
				const error = errors[key]
				if (error) {
					errorEntries.push({
						name: key,
						error,
						label: flatFormDefinition[key].label,
					})
				}
			}
			return errorEntries
		},
		[formDefinitionKeys, errors, flatFormDefinition],
	)

	const isDirty = useCallback(
		(name?: FieldKey) => {
			if (name) return Boolean(dirty[name])
			return Object.keys(dirty).length > 0
		},
		[dirty],
	)

	const isTouched = useCallback(
		(name?: FieldKey) => {
			if (name) return Boolean(touched[name])
			return Object.keys(touched).length > 0
		},
		[touched],
	)

	const isValid = useCallback(
		(name?: FieldKey) => {
			if (name) return !errors[name]
			return Object.values(errors).every((msg) => msg === "")
		},
		[errors],
	)

	const getDirty = useCallback(() => Object.freeze(dirty), [dirty])
	const getTouched = useCallback(() => Object.freeze(touched), [touched])

	return {
		resetForm,
		getForm,
		getField,
		getErrors,
		validate,
		__dangerouslySetField: setField,
		isTouched,
		isDirty,
		isValid,
		getDirty,
		getTouched,
	}
}

export { useStandardSchema, defineForm, toFormData }
export { FieldDefinition, FormDefinition, TypeFromDefinition } from "./types"
