import React from "react";
import {
    defineForm,
    useStandardSchema,
    type TypeFromDefinition,
} from "use-standard-schema";
import * as z from "zod";

import {
    Field,
    FieldControl,
    FieldDescription,
    FieldError,
    FieldLabel,
    Fieldset,
} from "@/components/ui/field";

const accountForm = defineForm({
    username: {
        label: "Username",
        description: "This is your public handle.",
        defaultValue: "",
        validate: z
            .string()
            .min(2, "Usernames need at least 2 characters.")
            .max(32, "Usernames can't exceed 32 characters."),
    },
    email: {
        label: "Email",
        description: "We'll send onboarding tips here.",
        defaultValue: "",
        validate: z.email("Enter a valid email address."),
    },
    password: {
        label: "Password",
        description: "Use 8+ characters with letters and numbers.",
        defaultValue: "",
        validate: z
            .string()
            .min(8, "Passwords must have at least 8 characters."),
    },
});

type AccountFormData = TypeFromDefinition<typeof accountForm>;

const submitHandler = (values: AccountFormData) => {
    console.log("Shadcn Field form submitted:", values);
};

export function ShadcnFieldExample() {
    const { getForm, getField } = useStandardSchema(accountForm);
    const handlers = getForm(submitHandler);

    const username = getField("username");
    const email = getField("email");
    const password = getField("password");

    const describedBy = (fieldId?: string, errorId?: string) =>
        [fieldId, errorId].filter(Boolean).join(" ") || undefined;

    return (
        <form {...handlers} className="space-y-6">
            <Fieldset className="space-y-6">
                <legend className="sr-only">Create an account</legend>

                <Field name={username.name} invalid={Boolean(username.error)}>
                    <FieldLabel htmlFor={username.name}>
                        {username.label}
                    </FieldLabel>
                    <FieldControl>
                        <input
                            id={username.name}
                            name={username.name}
                            defaultValue={username.defaultValue ?? ""}
                            aria-describedby={describedBy(
                                username.describedById,
                                username.errorId
                            )}
                            aria-errormessage={username.errorId}
                            aria-invalid={Boolean(username.error)}
                            autoComplete="username"
                            required
                        />
                    </FieldControl>
                    <FieldDescription id={username.describedById}>
                        {username.description}
                    </FieldDescription>
                    <FieldError id={username.errorId}>
                        {username.error}
                    </FieldError>
                </Field>

                <Field name={email.name} invalid={Boolean(email.error)}>
                    <FieldLabel htmlFor={email.name}>{email.label}</FieldLabel>
                    <FieldControl>
                        <input
                            id={email.name}
                            name={email.name}
                            type="email"
                            defaultValue={email.defaultValue ?? ""}
                            aria-describedby={describedBy(
                                email.describedById,
                                email.errorId
                            )}
                            aria-errormessage={email.errorId}
                            aria-invalid={Boolean(email.error)}
                            autoComplete="email"
                            required
                        />
                    </FieldControl>
                    <FieldDescription id={email.describedById}>
                        {email.description}
                    </FieldDescription>
                    <FieldError id={email.errorId}>{email.error}</FieldError>
                </Field>

                <Field name={password.name} invalid={Boolean(password.error)}>
                    <FieldLabel htmlFor={password.name}>
                        {password.label}
                    </FieldLabel>
                    <FieldControl>
                        <input
                            id={password.name}
                            name={password.name}
                            type="password"
                            defaultValue={password.defaultValue ?? ""}
                            aria-describedby={describedBy(
                                password.describedById,
                                password.errorId
                            )}
                            aria-errormessage={password.errorId}
                            aria-invalid={Boolean(password.error)}
                            autoComplete="new-password"
                            required
                        />
                    </FieldControl>
                    <FieldDescription id={password.describedById}>
                        {password.description}
                    </FieldDescription>
                    <FieldError id={password.errorId}>
                        {password.error}
                    </FieldError>
                </Field>
            </Fieldset>

            <div className="flex justify-end">
                <button type="submit" className="px-4 py-2 font-medium">
                    Create account
                </button>
            </div>
        </form>
    );
}
