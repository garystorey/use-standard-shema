import { render } from "@testing-library/react"
import React, { forwardRef, useImperativeHandle } from "react"
import { useStandardSchema } from "../src"
import { defineForm } from "../src/helpers"
import type { UseStandardSchemaReturn } from "../src/types"
import { email as emailValidator, string as reqString, throwing as throwingValidator } from "./test-validation-lib"

type SubmitHandler = (data: Record<string, unknown>) => void

type HookHarnessProps<FormDef> = {
        formDef: FormDef
}

type FormHarnessProps<FormDef> = HookHarnessProps<FormDef> & {
        onSubmitSpy: SubmitHandler
}

export function makeForm(nameDefault: string = "Joe") {
        return defineForm({
                name: { label: "Name", defaultValue: nameDefault, validate: reqString() },
                contact: {
                        email: { label: "Email", defaultValue: "", validate: emailValidator() },
                },
        })
}

export function makeThrowingForm(): FormType {
        return defineForm({
                name: {
                        label: "Name",
                        defaultValue: "Joe",
                        validate: throwingValidator("Boom!"),
                },
                contact: {
                        email: { label: "Email", defaultValue: "", validate: emailValidator() },
                },
        })
}

export type FormType = ReturnType<typeof makeForm>

const HookHarness = forwardRef<UseStandardSchemaReturn<FormType> | null, HookHarnessProps<FormType>>(function HookHarness(
        props,
        ref,
) {
        const api = useStandardSchema(props.formDef)
        useImperativeHandle(ref, () => api, [api])
        return null
})

const FormHarness = forwardRef<UseStandardSchemaReturn<FormType> | null, FormHarnessProps<FormType>>(function FormHarness(
        props,
        ref,
) {
        const api = useStandardSchema(props.formDef)
        const handlers = api.getForm(props.onSubmitSpy)

        useImperativeHandle(ref, () => api, [api])

        const nameField = api.getField("name")
        const emailField = api.getField("contact.email")

        return (
                <form
                        data-testid="form"
                        onSubmit={handlers.onSubmit}
                        onFocus={handlers.onFocus}
                        onBlur={handlers.onBlur}
                        onReset={handlers.onReset}
                >
                        <label htmlFor="name">{nameField.label}</label>
                        <input id="name" name="name" defaultValue={nameField.defaultValue} />

                        <label htmlFor="email">{emailField.label}</label>
                        <input id="email" name="contact.email" defaultValue={emailField.defaultValue} />

                        <button type="submit">Submit</button>
                        <button type="reset">Reset</button>
                </form>
        )
})

export function renderHookHarness(formDef: FormType = makeForm()) {
        const ref = React.createRef<UseStandardSchemaReturn<FormType> | null>()
        const view = render(<HookHarness ref={ref} formDef={formDef} />)

        return {
                form: formDef,
                ref,
                rerenderWith(nextForm: FormType) {
                        view.rerender(<HookHarness ref={ref} formDef={nextForm} />)
                },
        }
}

export function renderFormHarness({ formDef = makeForm(), onSubmitSpy }: { formDef?: FormType; onSubmitSpy: SubmitHandler }) {
        const ref = React.createRef<UseStandardSchemaReturn<FormType> | null>()
        const view = render(<FormHarness ref={ref} formDef={formDef} onSubmitSpy={onSubmitSpy} />)

        return {
                form: formDef,
                ref,
                rerenderWith(nextForm: FormType) {
                        view.rerender(<FormHarness ref={ref} formDef={nextForm} onSubmitSpy={onSubmitSpy} />)
                },
        }
}
