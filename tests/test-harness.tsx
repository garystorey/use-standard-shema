import React, { useLayoutEffect } from "react"
import { useStandardSchema } from "../src"
import type {
        DotPaths,
        ErrorEntry,
        FieldDefinition,
        FormDefinition,
        TypeFromDefinition,
} from "../src/types"

type HarnessField<Name extends string> = FieldDefinition & {
        name: Name
        defaultValue: string
        error: string
        touched: string
        dirty: string
        describedById: string
        errorId: string
}

export type HarnessApi<Def extends FormDefinition> = {
        resetForm: () => void
        getForm: (
                onSubmitHandler: (data: TypeFromDefinition<Def>) => void,
        ) => {
                onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
                onFocus: (event: React.FocusEvent<HTMLFormElement>) => void
                onBlur: (event: React.FocusEvent<HTMLFormElement>) => Promise<void>
                onReset: () => void
        }
        getField: <Name extends DotPaths<Def>>(name: Name) => HarnessField<Name>
        getErrors: <Name extends DotPaths<Def>>(name?: Name) => ErrorEntry[]
        validate: <Name extends DotPaths<Def>>(name?: Name) => Promise<boolean>
        __dangerouslySetField: <Name extends DotPaths<Def>>(name: Name, value: string) => Promise<void>
        isTouched: <Name extends DotPaths<Def>>(name?: Name) => boolean
        isDirty: <Name extends DotPaths<Def>>(name?: Name) => boolean
}

let latestApi: HarnessApi<FormDefinition> | null = null

export function getHarnessApi<Def extends FormDefinition>(): HarnessApi<Def> {
        if (!latestApi) {
                throw new Error("Harness API is not available. Did you render the Harness component?")
        }

        return latestApi as HarnessApi<Def>
}

type HarnessProps<Def extends FormDefinition> = {
        formDefinition: Def
        onSubmit: (data: TypeFromDefinition<Def>) => void
}

export function Harness<Def extends FormDefinition>({ formDefinition, onSubmit }: HarnessProps<Def>) {
        const api = useStandardSchema(formDefinition) as unknown as HarnessApi<Def>

        useLayoutEffect(() => {
                latestApi = api as unknown as HarnessApi<FormDefinition>

                return () => {
                        if (latestApi === api) {
                                latestApi = null
                        }
                }
        }, [api])

	const { getField, getForm } = api

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
				<p id={emailField.describedById} />
				<p hidden id={emailField.errorId} role="alert" aria-live="polite" data-testid="email-error">
					{emailField.error}
				</p>
			</div>

			<button type="submit">Submit</button>
			<button type="reset">Reset</button>

			<output data-testid="name-touched">{String(getField("user.name").touched)}</output>
			<output data-testid="email-touched">{String(getField("user.contact.email").touched)}</output>
			<output data-testid="name-dirty">{String(getField("user.name").dirty)}</output>
			<output data-testid="email-dirty">{String(getField("user.contact.email").dirty)}</output>
		</form>
	)
}
