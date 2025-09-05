import React, { useEffect } from "react";
import { useStandardSchema } from "../src";
export type HarnessApi = any;

export function Harness({
    schema,
    onSubmit,
    onApi,
}: {
    schema: any;
    onSubmit: (data: unknown) => void;
    onApi?: (api: HarnessApi) => void;
}) {
    const api = useStandardSchema(schema);

    useEffect(() => {
        if (onApi) onApi(api);
    }, [api, onApi]);

    const form = api.getForm(onSubmit);

    const nameField = api.getField("user.name");
    const emailField = api.getField("user.contact.email");

    const nameError = api.getField("user.name").error;
    const emailError = api.getField("user.contact.email").error;

    return (
        <form aria-label="form" {...form}>
            {/* NAME FIELD */}
            <div>
                <label htmlFor={nameField.name}>{nameField.label}</label>
                <input
                    id={nameField.name}
                    name={nameField.name}
                    defaultValue={nameField.defaultValue}
                    aria-describedby={nameField.describedById}
                    aria-errormessage={nameField.errorId}
                    aria-invalid={Boolean(nameError) || undefined}
                    data-testid="name"
                />
                {/* Description node linked via aria-describedby */}
                <p id={nameField.describedById} hidden>
                    {nameField.description}
                </p>
                {/* Error node linked via aria-errormessage */}
                <p
                    id={nameField.errorId}
                    role="alert"
                    aria-live="polite"
                    data-testid="name-error"
                >
                    {nameError}
                </p>
            </div>

            {/* EMAIL FIELD */}
            <div>
                <label htmlFor={emailField.name}>{emailField.label}</label>
                <input
                    id={emailField.name}
                    name={emailField.name}
                    defaultValue={emailField.defaultValue}
                    aria-describedby={emailField.describedById}
                    aria-errormessage={emailField.errorId}
                    aria-invalid={Boolean(emailError) || undefined}
                    data-testid="email"
                />
                {/* Even if description is empty, keep a node so aria-describedby resolves */}
                <p id={emailField.describedById} hidden />
                <p
                    id={emailField.errorId}
                    role="alert"
                    aria-live="polite"
                    data-testid="email-error"
                >
                    {emailError}
                </p>
            </div>

            <button type="submit">Submit</button>
            <button type="reset">Reset</button>

            {/* expose state readouts for assertions */}
            <output data-testid="name-touched">
                {String(api.getField("user.name").touched)}
            </output>
            <output data-testid="email-touched">
                {String(api.getField("user.contact.email").touched)}
            </output>
            <output data-testid="name-dirty">
                {String(api.getField("user.name").dirty)}
            </output>
            <output data-testid="email-dirty">
                {String(api.getField("user.contact.email").dirty)}
            </output>
        </form>
    );
}
