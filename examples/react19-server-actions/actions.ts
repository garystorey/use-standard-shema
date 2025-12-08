"use server"

import { validateForm } from "use-standard-schema"
import { serverActionForm } from "./form-definition"

type ActionState = { message?: string; error?: string }

async function authenticateUser(email: string, password: string) {
        await new Promise((resolve) => setTimeout(resolve, 50))

        if (email === "demo@example.com" && password === "password123") {
                return { message: "Signed in!" }
        }

        return { error: "Invalid email or password." }
}

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
        const result = await validateForm(serverActionForm, formData)

        if (!result.success) {
                return { error: "Check your email and password." }
        }

        return authenticateUser(result.data.email, result.data.password)
}
