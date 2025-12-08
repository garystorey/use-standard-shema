"use server"

import {
        toFormData,
        validateForm,
        type TypeFromDefinition,
} from "use-standard-schema"
import { serverActionForm } from "./form-definition"

type ActionState = { message?: string; error?: string }

function formDataToValues<TDefinition extends Record<string, unknown>>(
        definition: TDefinition,
        values: TypeFromDefinition<TDefinition>,
): FormData {
        return toFormData(definition, values)
}

async function authenticateUser(email: string, password: string) {
        await new Promise((resolve) => setTimeout(resolve, 50))

        if (email === "demo@example.com" && password === "password123") {
                return { message: "Signed in!" }
        }

        return { error: "Invalid email or password." }
}

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
        const incomingValues = Object.fromEntries(formData.entries())
        const result = await validateForm(serverActionForm, incomingValues)

        if (!result.success) {
                return { error: "Check your email and password." }
        }

        const sanitizedSubmission = formDataToValues(serverActionForm, result.data)

        return authenticateUser(
                sanitizedSubmission.get("email") as string,
                sanitizedSubmission.get("password") as string,
        )
}
