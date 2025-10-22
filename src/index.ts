import { type FocusEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	defineForm,
	deriveThrownMessage,
	deriveValidationMessage,
	extractValidator,
	flattenDefaults,
	flattenFormDefinition,
	resolveManualErrorMessage,
	toFormData,
	toInputString,
} from "./helpers"
import type {
	DotPaths,
	ErrorEntry,
	ErrorInfo,
	Errors,
	FieldDefinition,
	Flags,
	FormDefinition,
	FormValues,
	TypeFromDefinition,
	UseStandardSchemaReturn,
} from "./types"

/**
 * Custom hook to manage form state based on a form definition.
 * @param formDefinition - The form definition.
 * @returns An object containing methods and state for managing the form.
 */

function useStandardSchema<T extends FormDefinition>(formDefinition: T): UseStandardSchemaReturn<T> {
	type FieldKey = DotPaths<T>

	// Derived data
	const flatFormDefinition = useMemo(() => flattenFormDefinition(formDefinition), [formDefinition]) as Record<
		string,
		FieldDefinition
	>

	const initialValues = useMemo(() => flattenDefaults(formDefinition), [formDefinition])

	const initialValueStrings = useMemo(() => {
		const entries: Record<string, string> = {}
		for (const [key, value] of Object.entries(initialValues)) {
			entries[key] = toInputString(value)
		}
		return entries
	}, [initialValues])

	const formDefinitionKeys = useMemo(() => Object.keys(flatFormDefinition), [flatFormDefinition])

	// State
        const [data, setData] = useState<FormValues>(initialValues)
        const [errors, setErrors] = useState<Errors>({})
        const [touched, setTouched] = useState<Flags>({})
        const [dirty, setDirty] = useState<Flags>({})

        const validationTokensRef = useRef<Record<string, number>>({})
        const validationRunId = useRef(0)

        useEffect(() => {
                setData(initialValues)
                setErrors({})
                setTouched({})
                setDirty({})
                validationTokensRef.current = {}
                validationRunId.current += 1
        }, [initialValues])

	// --- Pure per-field validator (no state updates)
	const validateFieldValue = useCallback(
		async (field: string, value: string): Promise<string> => {
			const fieldDef = flatFormDefinition[field]
			if (!fieldDef) return `Field "${String(field)}" not found`

			const validator = extractValidator(fieldDef.validate)
			if (!validator) return "validator not available"

			try {
				const result = await validator(value)
				return deriveValidationMessage(result)
			} catch (error) {
				return deriveThrownMessage(error)
			}
		},
		[flatFormDefinition],
	)

	// --- Single-field validate (updates state for that field)
        const validateField = useCallback(
                async (field: string, value: string) => {
                        const runId = validationRunId.current
                        const token = (validationTokensRef.current[field] ?? 0) + 1
                        validationTokensRef.current[field] = token

                        const message = await validateFieldValue(field, value)

                        if (validationRunId.current !== runId || validationTokensRef.current[field] !== token) {
                                return false
                        }

                        setErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }))
                        return message === ""
                },
                [validateFieldValue],
        )

	// --- Full-form validate (batch state update, no flicker)
        const validateForm = useCallback(
                async (values?: FormValues) => {
                        const sourceValues = values ?? data
                        const runId = validationRunId.current
                        const newErrors: Errors = {}
                        const tokensForRun: Record<string, number> = {}

                        await Promise.all(
                                formDefinitionKeys.map(async (key) => {
                                        const token = (validationTokensRef.current[key] ?? 0) + 1
                                        validationTokensRef.current[key] = token
                                        tokensForRun[key] = token
                                        newErrors[key] = await validateFieldValue(key, sourceValues[key] ?? "")
                                }),
                        )

                        if (validationRunId.current !== runId) {
                                return false
                        }

                        setErrors((prev) => {
                                if (validationRunId.current !== runId) return prev

                                let changed = false
                                const next: Errors = {}

                                for (const key of formDefinitionKeys) {
                                        const prevValue = prev[key] ?? ""

                                        if (validationTokensRef.current[key] !== tokensForRun[key]) {
                                                next[key] = prevValue
                                                continue
                                        }

                                        const message = newErrors[key] ?? ""
                                        next[key] = message
                                        if (prevValue !== message) {
                                                changed = true
                                        }
                                }

                                if (!changed) {
                                        for (const key of Object.keys(prev)) {
                                                if (!formDefinitionKeys.includes(key)) {
                                                        changed = true
                                                        break
                                                }
                                        }
                                        if (!changed) return prev
                                }

                                return next
                        })

                        let isValid = true
                        for (const key of formDefinitionKeys) {
                                if (validationTokensRef.current[key] !== tokensForRun[key]) {
                                        isValid = false
                                        continue
                                }

                                if (newErrors[key] !== "") {
                                        isValid = false
                                }
                        }

                        return isValid
                },
                [formDefinitionKeys, data, validateFieldValue],
        )

        const resetForm = useCallback(() => {
                setData(initialValues)
                setErrors({})
                setTouched({})
                setDirty({})
                validationTokensRef.current = {}
                validationRunId.current += 1
        }, [initialValues])

	const getForm = useCallback(
		(onSubmitHandler: (data: TypeFromDefinition<typeof formDefinition>) => void) => {
			const onSubmit = async (e: FormEvent) => {
				const formEl = e.currentTarget as HTMLFormElement
				e.preventDefault()

				const submissionEntries = new Map<string, string>()
				for (const [key, rawValue] of new FormData(formEl).entries()) {
					if (!submissionEntries.has(key)) {
						submissionEntries.set(key, typeof rawValue === "string" ? rawValue : String(rawValue))
					}
				}

				const updates: Record<string, string> = {}
				let hasChanges = false

				for (const key of formDefinitionKeys) {
					const stateValue = data[key]
					const stateString = toInputString(stateValue)
					const initialString = initialValueStrings[key] ?? ""
					const submissionValue = submissionEntries.get(key)

					let resolvedValue = stateValue

					if (submissionValue !== undefined) {
						const shouldPreferState = stateString !== initialString && submissionValue === initialString

						// When a user edits a field and then reverts it back to the
						// default inside the DOM before submit, FormData reports the
						// default string. Earlier versions overwrote programmatic
						// updates in that scenario which meant consumers received stale
						// values. The extra guard preserves the latest state value
						// unless the DOM truly diverges from what we already hold.

						if (!shouldPreferState) {
							resolvedValue = submissionValue
						}
					}

					if (!Object.is(stateValue, resolvedValue)) {
						updates[key] = resolvedValue
						hasChanges = true
					}
				}

				const finalValues: FormValues = hasChanges ? { ...data, ...updates } : data

				if (hasChanges) {
					setData(finalValues)
				}

				const isValid = await validateForm(finalValues)
				if (isValid) {
					onSubmitHandler(finalValues as TypeFromDefinition<typeof formDefinition>)
					resetForm()
					formEl.reset()
				}
			}

			const onFocus = (e: FocusEvent<HTMLFormElement>) => {
				const field = e.target.name
				if (!field || !(field in flatFormDefinition)) return

				setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
				setErrors((prev) => (prev[field] === "" ? prev : { ...prev, [field]: "" }))
			}

			const onBlur = async (e: FocusEvent<HTMLFormElement>) => {
				const field = e.target.name
				if (!field || !(field in flatFormDefinition)) return

				const value = e.target.value
				const initialValue = initialValueStrings[field] ?? ""
				const isDirty = value !== initialValue

				setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
				setData((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }))

				setDirty((prev) => {
					const wasDirty = Boolean(prev[field])
					if (isDirty) {
						if (wasDirty) return prev
						return { ...prev, [field]: true }
					}

					if (!wasDirty) return prev

					const next = { ...prev }
					delete next[field]
					return next
				})

				await validateField(field, value)
			}

			const onReset = () => resetForm()

			return { onSubmit, onFocus, onBlur, onReset }
		},
		[flatFormDefinition, data, initialValueStrings, resetForm, validateField, formDefinitionKeys, validateForm],
	)

	const getField = useCallback(
		(name: FieldKey) => {
			const key = name as string

			const def = flatFormDefinition[key]
			const describedById = `${key}-description`
			const errorId = `${key}-error`

			if (!def) throw new Error(`Field "${key}" not found`)

			const { validate: _validate, ...fieldDef } = def

			return {
				...fieldDef,
				name: key,
				defaultValue: data[key] ?? "",
				error: errors[key] ?? "",
				touched: touched[key] ?? false,
				dirty: dirty[key] ?? false,
				describedById,
				errorId,
			}
		},
		[flatFormDefinition, data, errors, touched, dirty],
	)

        const setField = useCallback(
                async (name: FieldKey, value: string) => {
                        const field = name as string
                        if (!(field in flatFormDefinition)) {
                                throw new Error(`Field "${field}" not found`)
                        }
                        const initialValue = initialValueStrings[field] ?? ""
                        const isDirty = value !== initialValue

			setData((prev) => (prev[field] === value ? prev : { ...prev, [field]: value }))
			setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
			setDirty((prev) => {
				const wasDirty = Boolean(prev[field])
				if (isDirty) {
					if (wasDirty) return prev
					return { ...prev, [field]: true }
				}

				if (!wasDirty) return prev

				const next = { ...prev }
				delete next[field]
				return next
			})

                        await validateField(field, value)
                },
                [flatFormDefinition, validateField, initialValueStrings],
        )

	const setError = useCallback(
		(name: FieldKey, info: ErrorInfo) => {
			const field = name as string

			if (!(field in flatFormDefinition)) {
				throw new Error(`Field "${field}" not found`)
			}

			const message = resolveManualErrorMessage(info)

			setErrors((prev) => {
				const current = prev[field]

				if (message == null) {
					if (current === undefined) return prev
					const next = { ...prev }
					delete next[field]
					return next
				}

				return current === message ? prev : { ...prev, [field]: message }
			})
		},
		[flatFormDefinition],
	)

	const getErrors = useCallback(
		(name?: FieldKey): ErrorEntry[] => {
			if (name) {
				const error = errors[name as string]
				if (!error) return []
				return [
					{
						name: name as string,
						error,
						label: flatFormDefinition[name as string]?.label,
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

	const isTouched = useCallback(
		(name?: FieldKey) => {
			if (name) {
				const key = name as string
				return Boolean(touched[key])
			}

			return Object.values(touched).some(Boolean)
		},
		[touched],
	)

	const isDirty = useCallback(
		(name?: FieldKey) => {
			if (name) {
				const key = name as string
				return Boolean(dirty[key])
			}

			return Object.values(dirty).some(Boolean)
		},
		[dirty],
	)

	return {
		resetForm,
		getForm,
		getField,
		getErrors,
		setField,
		setError,
		isTouched,
		isDirty,
	}
}

export { useStandardSchema, defineForm, toFormData }
export type {
	ErrorEntry,
	FieldData,
	FieldDefinition,
	FormDefinition,
	TypeFromDefinition,
	UseStandardSchemaReturn,
} from "./types"
