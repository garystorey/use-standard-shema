import { type FocusEvent, type FormEvent, useCallback, useMemo, useState } from "react"
import { defineForm, flattenDefaults, flattenSchema, toFormData } from "./helpers"
import type { DotPaths, Errors, FieldDefinition, Flags, FormDefinition, FormValues } from "./types"

/** * Custom hook to manage form state based on a schema.
 * @param schemaMap - The schema definition for the form.
 * @returns An object containing methods and state for managing the form.
 */

function useStandardSchema<T extends FormDefinition>(schemaMap: T) {
	type FieldKey = DotPaths<T>

	const flatSchemaMap = useMemo(() => flattenSchema(schemaMap), [schemaMap]) as Record<string, FieldDefinition>
	const initialValues = useMemo(() => flattenDefaults(schemaMap), [schemaMap])

	const [data, setData] = useState<FormValues>(initialValues)
	const [errors, setErrors] = useState<Errors>({})
	const [touched, setTouched] = useState<Flags>({})
	const [dirty, setDirty] = useState<Flags>({})

	const validateField = useCallback(
		async (field: string, value: string) => {
			const schema = flatSchemaMap[field]
			const result = await schema.validate["~standard"].validate(value)
			const message = result?.issues?.[0]?.message ?? ""
			setErrors((prev) => ({ ...prev, [field]: message }))
			return Boolean(message === "")
		},
		[flatSchemaMap],
	)

	async function validateForm() {
		const newErrors: Errors = {}
		await Promise.all(
			Object.keys(flatSchemaMap).map(async (key) => {
				const result = await flatSchemaMap[key].validate["~standard"].validate(data[key])
				newErrors[key] = result?.issues?.[0]?.message ?? ""
			}),
		)
		setErrors(newErrors)
		return Object.values(newErrors).every((msg) => msg === "")
	}

	async function validate(name?: FieldKey) {
		if (name) {
			return await validateField(name, data[name])
		} else {
			return await validateForm()
		}
	}
	const resetForm = useCallback(() => {
		setData(initialValues)
		setErrors({})
		setTouched({})
		setDirty({})
	}, [initialValues])

	const getForm = useCallback(
		(onSubmitHandler: (data: FormValues) => void) => {
			const onSubmit = async (e: FormEvent) => {
				e.preventDefault()
				const newErrors: Errors = {}

				await Promise.all(
					Object.keys(flatSchemaMap).map(async (key) => {
						const result = await flatSchemaMap[key].validate["~standard"].validate(data[key])
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

			const onReset = () => resetForm()

			return { onSubmit, onFocus, onBlur, onReset }
		},
		[flatSchemaMap, data, initialValues, resetForm, validateField],
	)

	// index.ts (inside getField)
	const getField = useCallback(
		(name: FieldKey) => {
			const key = name as string

			const def = flatSchemaMap[key]
			if (!def) {
				throw new Error(`Field "${key}" does not exist in the schema.`)
			}

			const { validate: _validate, ...fieldDef } = def
			const describedById = `${key}-description`
			const errorId = `${key}-error`

			return {
				...fieldDef,
				name: key,
				defaultValue: data[key] ?? "",
				error: errors[key] ?? "",
				touched: !!touched[key],
				dirty: !!dirty[key],
				describedById,
				errorId,
			}
		},
		[flatSchemaMap, data, errors, touched, dirty],
	)

	async function __setField(name: FieldKey, value: string) {
		const field = name as string
		const result = await validateField(field, value)
		if (result) setData((prev) => ({ ...prev, [field]: value }))
		setTouched((prev) => ({ ...prev, [field]: true }))
		setDirty((prev) => ({ ...prev, [field]: true }))
	}

	const getErrors = useCallback(() => {
		const newErrors: Errors = {}
		Object.keys(flatSchemaMap).forEach((key) => {
			if (errors[key]) newErrors[key] = errors[key]
		})
		return newErrors
	}, [flatSchemaMap, errors])

	return {
		resetForm,
		getForm,
		getField,
		getErrors,
		validate,
		__setField,
		errors: Object.freeze(errors),
		touched: Object.freeze(touched),
		dirty: Object.freeze(dirty),
	}
}

export { useStandardSchema, defineForm, toFormData }
export { FieldDefinition, FormDefinition, TypeFromDefinition } from "./types"
