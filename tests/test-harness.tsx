import React, { useImperativeHandle } from "react"
import { useStandardSchema } from "../src"
import type { DotPaths, FieldDefinition, FormDefinition, TypeFromDefinition } from "../src"

type RequiredHarnessFields = {
        user: ({
                name: FieldDefinition
        } & FormDefinition) & {
                contact: ({
                        email: FieldDefinition
                } & FormDefinition)
        }
}

export type HarnessSchema = FormDefinition & RequiredHarnessFields

type PathFor<TSchema extends HarnessSchema, TPath extends string> = TPath extends DotPaths<TSchema>
        ? TPath
        : never

export type HarnessApi<TSchema extends HarnessSchema = HarnessSchema> = ReturnType<
        typeof useStandardSchema<TSchema>
>

export interface HarnessProps<TSchema extends HarnessSchema> {
        schema: TSchema
        onSubmit: (data: TypeFromDefinition<TSchema>) => void
}

export const Harness = React.forwardRef(function Harness<TSchema extends HarnessSchema>(
        { schema, onSubmit }: HarnessProps<TSchema>,
        ref: React.ForwardedRef<HarnessApi<TSchema>>,
) {
        const api = useStandardSchema(schema)

        useImperativeHandle(ref, () => api, [api])

        const { getField, getForm, isDirty, isTouched } = api

        const form = getForm(onSubmit)

        const namePath: PathFor<TSchema, "user.name"> = "user.name"
        const emailPath: PathFor<TSchema, "user.contact.email"> = "user.contact.email"

        const nameField = getField(namePath)
        const emailField = getField(emailPath)

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
				<p id={emailField.describedById}>{emailField.description}</p>
				<p hidden id={emailField.errorId} role="alert" aria-live="polite" data-testid="email-error">
					{emailField.error}
				</p>
			</div>

			<button type="submit">Submit</button>
			<button type="reset">Reset</button>

      <output data-testid="name-touched">{String(isTouched(namePath))}</output>
      <output data-testid="email-touched">{String(isTouched(emailPath))}</output>
      <output data-testid="name-dirty">{String(isDirty(namePath))}</output>
      <output data-testid="email-dirty">{String(isDirty(emailPath))}</output>
   </form>
        )
})
