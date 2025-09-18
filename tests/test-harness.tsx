import React, { useEffect } from "react"
import { useStandardSchema } from "../src"
export type HarnessApi = any

export function Harness({
	schema,
	onSubmit,
	onApi,
}: {
	schema: any
	onSubmit: (data: unknown) => void
	onApi?: (api: HarnessApi) => void
}) {
	const api = useStandardSchema(schema)

	useEffect(() => onApi && onApi(api), [api, onApi])

	const { getField, getForm, isDirty, isTouched } = api

	const form = getForm(onSubmit)

	const nameField = getField("user.name")
	const emailField = getField("user.contact.email")

	return (
		<form aria-label="Form" {...form}>
			<div>
				<label htmlFor={nameField.name}>{nameField.label}</label>
				<input
					id={nameField.name}
					name={nameField.name}
					defaultValue={nameField.defaultValue}
					aria-describedby={nameField.describedById}
					aria-errormessage={nameField.errorId}
					aria-invalid={Boolean(nameField.error) || undefined}
					data-testid="name"
				/>
				<p id={nameField.describedById}>{nameField.description}</p>
				<p hidden id={nameField.errorId} role="alert" aria-live="polite" data-testid="name-error">
					{nameField.error}
				</p>
			</div>

			<div>
				<label htmlFor={emailField.name}>{emailField.label}</label>
				<input
					id={emailField.name}
					name={emailField.name}
					defaultValue={emailField.defaultValue}
					aria-describedby={emailField.describedById}
					aria-errormessage={emailField.errorId}
					aria-invalid={Boolean(emailField.error) || undefined}
					data-testid="email"
				/>
				<p id={emailField.describedById} >{emailField.description}</p>
				<p hidden id={emailField.errorId} role="alert" aria-live="polite" data-testid="email-error">
					{emailField.error}
				</p>
			</div>

			<button type="submit">Submit</button>
			<button type="reset">Reset</button>

			<output data-testid="name-touched">{String(isTouched("user.name"))}</output>
			<output data-testid="email-touched">{String(isTouched("user.contact.email"))}</output>
			<output data-testid="name-dirty">{String(isDirty("user.name"))}</output>
			<output data-testid="email-dirty">{String(isDirty("user.contact.email"))}</output>
		</form>
	)
}
