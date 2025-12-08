"use server"

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
        const emailResult = serverActionForm.email.validate.safeParse(formData.get("email"))
        const passwordResult = serverActionForm.password.validate.safeParse(formData.get("password"))

        if (!emailResult.success || !passwordResult.success) {
                return { error: "Check your email and password." }
        }

        return authenticateUser(emailResult.data, passwordResult.data)
}
