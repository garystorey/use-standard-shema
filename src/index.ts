import { type FocusEvent, type FormEvent, useCallback, useMemo, useRef, useState } from "react"
import {
	DEFAULT_VALIDATION_ERROR,
	defineForm,
	extractIssues,
	flattenFormDefinition,
	normalizeThrownError,
	readIssueMessage,
	toFormData,
} from "./helpers"
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
	const { flatFormDefinition, initialValues, formDefinitionKeys } = useMemo(() => {
		const flattened = flattenFormDefinition(formDefinition) as Record<string, FieldDefinition>
		const defaults: FormValues = {}

		for (const [key, fieldDef] of Object.entries(flattened)) {
			defaults[key] = fieldDef.defaultValue ?? ""
		}

		return {
			flatFormDefinition: flattened,
			initialValues: defaults,
			formDefinitionKeys: Object.keys(flattened),
		}
	}, [formDefinition])

	// State
	const [data, setData] = useState<FormValues>(initialValues)
	const [errors, setErrors] = useState<Errors>({})
	const [touched, setTouched] = useState<Flags>({})
	const [dirty, setDirty] = useState<Flags>({})

	const latestValidationValueRef = useRef<Record<string, string>>({})

	// --- Pure per-field validator (no state updates)
	const validateFieldValue = useCallback(
		async (field: string, value: string): Promise<string> => {
			const fieldDef = flatFormDefinition[field]
			if (!fieldDef) {
				return DEFAULT_VALIDATION_ERROR
			}

			try {
				const result = await fieldDef.validate["~standard"].validate(value)
				const extracted = extractIssues(result)
				if (extracted?.hadIssues) {
					const message = readIssueMessage(extracted.issues)
					return message ?? DEFAULT_VALIDATION_ERROR
				}

				return ""
			} catch (error) {
				return normalizeThrownError(error, DEFAULT_VALIDATION_ERROR)
			}
		},
		[flatFormDefinition],
	)

	// --- Single-field validate (updates state for that field)
	const validateField = useCallback(
		async (field: string, value: string) => {
			latestValidationValueRef.current[field] = value
			const message = await validateFieldValue(field, value)
			const ok = message === ""

			if (latestValidationValueRef.current[field] !== value) {
				return ok
			}

			setErrors((prev) => {
				if (prev[field] === message) return prev
				return { ...prev, [field]: message }
			})

			return ok
		},
		[validateFieldValue],
	)

	// --- Full-form validate (batch state update, no flicker)
	const validateForm = useCallback(async () => {
		const entries = await Promise.all(
			formDefinitionKeys.map(async (key) => [key, await validateFieldValue(key, data[key] ?? "")] as const),
		)

		const newErrors = Object.fromEntries(entries) as Errors
		setErrors(newErrors)

		return entries.every(([, message]) => message === "")
	}, [formDefinitionKeys, data, validateFieldValue])

	const validate = useCallback(
		async (name?: FieldKey) => {
			if (name) {
				const key = name as string
				return validateField(key, data[key] ?? "")
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
		latestValidationValueRef.current = {}
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
				touched: Boolean(touched[key]),
				dirty: Boolean(dirty[key]),
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

			if (latestValidationValueRef.current[field] !== value) {
				return
			}

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
				return error
					? [
							{
								name,
								error,
								label: flatFormDefinition[name]?.label,
							},
						]
					: []
			}

			return formDefinitionKeys.reduce<ErrorEntry[]>((errorEntries, key) => {
				const error = errors[key]
				if (error) {
					errorEntries.push({
						name: key,
						error,
						label: flatFormDefinition[key].label,
					})
				}
				return errorEntries
			}, [])
		},
		[formDefinitionKeys, errors, flatFormDefinition],
	)

	const isDirty = useCallback(
		(name?: FieldKey) => {
			if (name) return Boolean(dirty[name])
			return Object.values(dirty).some(Boolean)
		},
		[dirty],
	)

	const isTouched = useCallback(
		(name?: FieldKey) => {
			if (name) return Boolean(touched[name])
			return Object.values(touched).some(Boolean)
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
export { FieldDefinition, FieldDefintionProps, FormDefinition, TypeFromDefinition } from "./types"
