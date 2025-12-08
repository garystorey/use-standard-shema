"use client"

import { useActionState } from "react"
import { toFormData, useStandardSchema } from "use-standard-schema"
import type { login } from "./actions"
import { serverActionForm, type ServerActionValues } from "./form-definition"

type ActionState = Awaited<ReturnType<typeof login>>

type ClientFormProps = { action: typeof login }

export function ServerActionClientForm({ action }: ClientFormProps) {
        const [actionState, formAction, isPending] = useActionState<ActionState, FormData>(action, {})
        const { getForm, getField } = useStandardSchema(serverActionForm)

        const formHandlers = getForm((values: ServerActionValues) => {
                void formAction(toFormData(values))
        })

        const email = getField("email")
        const password = getField("password")

        return (
                <form {...formHandlers} aria-busy={isPending} className="stack">
                        <label>
                                {email.label}
                                <input
                                        id={email.name}
                                        name={email.name}
                                        defaultValue={email.defaultValue}
                                        autoComplete="email"
                                        aria-errormessage={email.errorId}
                                        required
                                        disabled={isPending}
                                />
                        </label>
                        <p id={email.errorId} role="alert">{email.error}</p>

                        <label>
                                {password.label}
                                <input
                                        id={password.name}
                                        name={password.name}
                                        type="password"
                                        defaultValue={password.defaultValue}
                                        autoComplete="current-password"
                                        aria-errormessage={password.errorId}
                                        required
                                        disabled={isPending}
                                />
                        </label>
                        <p id={password.errorId} role="alert">{password.error}</p>

                        <button type="submit" disabled={isPending}>
                                {isPending ? "Signing in..." : "Sign in"}
                        </button>

                        {actionState?.message && <p role="status">{actionState.message}</p>}
                        {actionState?.error && <p role="alert">{actionState.error}</p>}
                </form>
        )
}
