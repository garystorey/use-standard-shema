"use server"

import { validateForm, type TypeFromDefinition } from "use-standard-schema"
import { serverActionForm } from "./form-definition"

type ActionState = { message?: string; error?: string }

function formDataToValues<TDefinition extends Record<string, unknown>>(
        definition: TDefinition,
        formData: FormData,
): TypeFromDefinition<TDefinition> {
        const values: Record<string, unknown> = {}

        for (const fieldName of Object.keys(definition)) {
                values[fieldName] = formData.get(fieldName)
        }

        return values as TypeFromDefinition<TDefinition>
}

async function authenticateUser(email: string, password: string) {
        await new Promise((resolve) => setTimeout(resolve, 50))

        if (email === "demo@example.com" && password === "password123") {
                return { message: "Signed in!" }
        }

        return { error: "Invalid email or password." }
}

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
        const result = await validateForm(serverActionForm, formDataToValues(serverActionForm, formData))

        if (!result.success) {
                return { error: "Check your email and password." }
        }

        return authenticateUser(result.data.email, result.data.password)
}
