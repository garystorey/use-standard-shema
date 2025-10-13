import React from "react"
import type { ComponentPropsWithoutRef } from "react"
import {
	defineForm,
	useStandardSchema,
	type FieldDefinitionProps,
	type TypeFromDefinition,
} from "use-standard-schema"
import * as z from "zod"

const profileForm = defineForm({
	firstName: {
		label: "First name",
		defaultValue: "",
		validate: z.string().min(1, "First name is required"),
	},
	lastName: {
		label: "Last name",
		defaultValue: "",
		validate: z.string().min(1, "Last name is required"),
	},
})

type NativeInputProps = Omit<ComponentPropsWithoutRef<"input">, keyof FieldDefinitionProps>

interface TextFieldProps extends Partial<FieldDefinitionProps>, NativeInputProps {}

function TextField({
	name,
	label,
	description,
	describedById,
	errorId,
	error,
	defaultValue,
	touched,
	dirty,
	...inputProps
}: TextFieldProps) {
	if (!name) {
		throw new Error("Field name is required")
	}

	const resolvedLabel = label ?? name
	const resolvedDescription = description ?? ""
	const describedBy = describedById ?? `${name}-description`
	const resolvedErrorId = errorId ?? `${name}-error`
	const fieldStateClass = dirty ? " field--dirty" : touched ? " field--touched" : ""
	const errorMessage = error ?? ""
	const errorClass = errorMessage ? " field--error" : ""

	return (
		<div className={`field${fieldStateClass}${errorClass}`}>
			<label htmlFor={name}>{resolvedLabel}</label>
			<input
				id={name}
				name={name}
				defaultValue={defaultValue ?? ""}
				aria-describedby={describedBy}
				aria-errormessage={resolvedErrorId}
				aria-invalid={Boolean(errorMessage)}
				{...inputProps}
			/>
			{resolvedDescription && <p id={describedBy}>{resolvedDescription}</p>}
			<p id={resolvedErrorId} role="alert">
				{errorMessage}
			</p>
		</div>
	)
}

export function CustomFieldComponentExample() {
	const submitHandler = (values: TypeFromDefinition<typeof profileForm>) => {
		console.log("Profile submitted:", values)
	}

	const { getForm, getField } = useStandardSchema(profileForm)
	const handlers = getForm(submitHandler)

	return (
		<form {...handlers}>
			<TextField {...getField("firstName")} className="field-input" />
			<TextField {...getField("lastName")} className="field-input" />

			<button type="submit">Save</button>
		</form>
	)
}
