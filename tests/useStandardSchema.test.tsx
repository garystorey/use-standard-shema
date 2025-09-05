import React, { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { act } from "react";

import { useStandardSchema, defineForm } from "../src";
import type { StandardSchemaV1 } from "@standard-schema/spec";

/** ----------------------------------------------------------------
 * Typed schema helpers compatible with Standard Schema V1
 * ---------------------------------------------------------------- */
interface StringSchema extends StandardSchemaV1<string> {
    type: "string";
    message: string;
}

function string(message: string = "Required"): StringSchema {
    return {
        type: "string",
        message,
        "~standard": {
            version: 1,
            vendor: "tests",
            validate(value) {
                return typeof value === "string" && value.trim().length > 0
                    ? { value }
                    : { issues: [{ message }] };
            },
        },
    };
}

function email(message: string = "Invalid email"): StringSchema {
    return {
        type: "string",
        message,
        "~standard": {
            version: 1,
            vendor: "tests",
            validate(value) {
                if (typeof value !== "string") return { issues: [{ message }] };
                return /@/.test(value) ? { value } : { issues: [{ message }] };
            },
        },
    };
}

type HarnessApi = any;

function Harness({
    schema,
    onSubmit,
    onApi,
}: {
    schema: any;
    onSubmit: (data: unknown) => void;
    onApi: (api: HarnessApi) => void;
}) {
    const api = useStandardSchema(schema);

    useEffect(() => {
        onApi(api);
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

describe("useStandardSchema", () => {
    const schema = defineForm({
        user: {
            name: {
                label: "Name",
                description: "Your full name",
                defaultValue: "",
                validate: string("Required"),
            },
            contact: {
                email: {
                    label: "Email",
                    defaultValue: "default@example.com",
                    validate: email("Invalid email"),
                },
            },
        },
    });

    it("initializes defaults, touched/dirty flags, and getField metadata", () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        const name = screen.getByTestId("name") as HTMLInputElement;
        const emailInput = screen.getByTestId("email") as HTMLInputElement;

        expect(name.value).toBe("");
        expect(emailInput.value).toBe("default@example.com");

        // ARIA links exist and point to real nodes
        const nameDescId = name.getAttribute("aria-describedby");
        const emailErrId = emailInput.getAttribute("aria-errormessage");
        expect(document.getElementById(nameDescId!)).toBeTruthy();
        expect(document.getElementById(emailErrId!)).toBeTruthy();

        expect(screen.getByTestId("name-touched")).toHaveTextContent("false");
        expect(screen.getByTestId("name-dirty")).toHaveTextContent("false");
        expect(screen.getByTestId("email-touched")).toHaveTextContent("false");
        expect(screen.getByTestId("email-dirty")).toHaveTextContent("false");
    });

    it("onBlur marks touched; only marks dirty & validates when value changed", async () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();
        const user = userEvent.setup();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        const emailInput = screen.getByTestId("email") as HTMLInputElement;

        // Blur without change -> touched true, dirty false, no validation
        await user.click(emailInput); // focus
        await user.tab(); // blur
        expect(screen.getByTestId("email-touched")).toHaveTextContent("true");
        expect(screen.getByTestId("email-dirty")).toHaveTextContent("false");
        expect(screen.getByTestId("email-error")).toHaveTextContent("");

        // Change to invalid (no '@'), blur -> dirty true + error set
        await user.click(emailInput);
        await user.clear(emailInput);
        await user.type(emailInput, "not-an-email");
        await user.tab();
        expect(screen.getByTestId("email-dirty")).toHaveTextContent("true");
        expect(screen.getByTestId("email-error")).toHaveTextContent(
            "Invalid email"
        );
        expect(emailInput).toHaveAttribute("aria-invalid", "true");
    });

    it("onFocus clears error for that field", async () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();
        const user = userEvent.setup();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        const emailInput = screen.getByTestId("email") as HTMLInputElement;

        await user.clear(emailInput);
        await user.type(emailInput, "oops");
        await user.tab(); // blur -> validate
        expect(screen.getByTestId("email-error")).toHaveTextContent(
            "Invalid email"
        );

        await user.click(emailInput); // focus -> clear error
        expect(screen.getByTestId("email-error")).toHaveTextContent("");
        expect(emailInput).not.toHaveAttribute("aria-invalid");
    });

    it("validate(name) validates one field; validate() validates entire form", async () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();
        const user = userEvent.setup();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        const nameInput = screen.getByTestId("name") as HTMLInputElement;
        const emailInput = screen.getByTestId("email") as HTMLInputElement;

        // Make email invalid and BLUR so the hook commits internal data
        await user.clear(emailInput);
        await user.type(emailInput, "bad");
        await user.tab(); // commit via onBlur

        // validate only the email field -> should show error
        await act(async () => {
            await api!.validate("user.contact.email");
        });
        expect(screen.getByTestId("email-error")).toHaveTextContent(
            "Invalid email"
        );

        // Fix email, blur to commit, then validate field again -> clears error
        await user.clear(emailInput);
        await user.type(emailInput, "valid@example.com");
        await user.tab();

        await act(async () => {
            await api!.validate("user.contact.email");
        });
        expect(screen.getByTestId("email-error")).toHaveTextContent("");

        // Full-form validate should be FALSE right now because name is still required & empty
        await act(async () => {
            await expect(api!.validate()).resolves.toBe(false);
        });

        // Fill name, blur to commit
        await user.type(nameInput, "Alice");
        await user.tab();

        // Now full-form validate should pass
        await act(async () => {
            await expect(api!.validate()).resolves.toBe(true);
        });
    });

    it("__dangerouslySetField sets value and flags (and validates) before data commit", async () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        await act(async () => {
            await api!.__dangerouslySetField("user.contact.email", "invalid");
        });
        expect(screen.getByTestId("email-dirty")).toHaveTextContent("true");
        expect(screen.getByTestId("email-touched")).toHaveTextContent("true");
        expect(screen.getByTestId("email-error")).toHaveTextContent(
            "Invalid email"
        );

        await act(async () => {
            await api!.__dangerouslySetField(
                "user.contact.email",
                "good@ex.com"
            );
        });
        expect(screen.getByTestId("email-error")).toHaveTextContent("");
    });

    it("getErrors returns only populated errors", async () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();
        const user = userEvent.setup();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        const emailInput = screen.getByTestId("email") as HTMLInputElement;
        await user.clear(emailInput);
        await user.type(emailInput, "nope");
        await user.tab(); // commit

        await act(async () => {
            await api!.validate("user.contact.email");
        });

        const errs = api!.getErrors();
        expect(Array.isArray(errs)).toBe(true);
        expect(errs).toEqual([
            { key: "user.contact.email", error: "Invalid email" },
        ]);
    });

    it("getForm: prevents submit when invalid, submits when valid, and supports reset", async () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();
        const user = userEvent.setup();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        const name = screen.getByTestId("name") as HTMLInputElement;
        const emailInput = screen.getByTestId("email") as HTMLInputElement;

        // Make invalid
        await user.clear(emailInput);
        await user.type(emailInput, "bad");
        await user.click(screen.getByText("Submit"));
        expect(onSubmit).not.toHaveBeenCalled(); // blocked by validation

        // Fix values
        await user.clear(name);
        await user.type(name, "Alice");
        await user.clear(emailInput);
        await user.type(emailInput, "alice@example.com");

        await user.click(screen.getByText("Submit"));
        expect(onSubmit).toHaveBeenCalledTimes(1);

        // Reset should clear flags back to initial
        await user.click(screen.getByText("Reset"));
        expect(screen.getByTestId("name-touched")).toHaveTextContent("false");
        expect(screen.getByTestId("email-dirty")).toHaveTextContent("false");
    });

    it("getField throws for unknown keys", () => {
        let api: HarnessApi;
        const onSubmit = vi.fn();

        render(
            <Harness
                schema={schema}
                onSubmit={onSubmit}
                onApi={(x) => {
                    api = x;
                }}
            />
        );

        expect(() => api!.getField("user.unknown")).toThrow(
            'Field "user.unknown" does not exist in the form definition.'
        );
    });
});
