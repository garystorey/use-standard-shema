"use client";

import { useState, useTransition } from "react";
import {
    defineForm,
    useStandardSchema,
    validateForm,
    type TypeFromDefinition,
    type ErrorEntry,
} from "use-standard-schema";
import { z } from "zod";

const loginForm = defineForm({
    email: {
        label: "Email",
        defaultValue: "",
        validate: z.string().email("Enter a valid email"),
    },
    password: {
        label: "Password",
        defaultValue: "",
        validate: z.string().min(8, "Use at least 8 characters"),
    },
});

async function login(values: TypeFromDefinition<typeof loginForm>) {
    "use server";

    const { isValid, errors } = await validateForm(loginForm, values);
    if (!isValid) {
        console.error("Server-side validation failed", errors);
        return "Please correct the highlighted errors";
    }

    console.log("Server action login", values);
    // Replace this stub with your auth logic (cookies, headers, etc.).
    return `Logged in as ${values.email}`;
}

export default function ServerActionLoginExample() {
    const { getForm, getField, getErrors } = useStandardSchema(loginForm);
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // getForm runs the built-in validation before calling the server action.
    const formHandlers = getForm((values) => {
        startTransition(async () => {
            const result = await login(values);
            setMessage(result);
        });
    });

    const email = getField("email");
    const password = getField("password");
    const errors = getErrors();

    return (
        <form {...formHandlers}>
            {errors.length > 0 && (
                <div role="alert">
                    <ul>
                        {errors.map((error: ErrorEntry) => (
                            <li key={error.name}>
                                {error.label}: {error.error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <label htmlFor={email.name}>{email.label}</label>
            <input
                id={email.name}
                name={email.name}
                type="email"
                defaultValue={email.defaultValue ?? ""}
                aria-describedby={email.describedById}
                aria-errormessage={email.errorId}
            />
            <p id={email.errorId}>{email.error}</p>

            <label htmlFor={password.name}>{password.label}</label>
            <input
                id={password.name}
                name={password.name}
                type="password"
                defaultValue={password.defaultValue ?? ""}
                aria-describedby={password.describedById}
                aria-errormessage={password.errorId}
            />
            <p id={password.errorId}>{password.error}</p>

            <p role="status">{isPending ? "Submitting..." : message}</p>
            <button type="submit" disabled={isPending}>
                Log in
            </button>
        </form>
    );
}
