import * as React from "react"

declare module "@/components/ui/field" {
        export interface FieldProps extends React.ComponentPropsWithoutRef<"div"> {
                invalid?: boolean
        }

        export const Field: React.ForwardRefExoticComponent<
                FieldProps & React.RefAttributes<HTMLDivElement>
        >

        export const Fieldset: React.ForwardRefExoticComponent<
                React.ComponentPropsWithoutRef<"fieldset"> &
                        React.RefAttributes<HTMLFieldSetElement>
        >

        export const FieldLabel: React.ForwardRefExoticComponent<
                React.ComponentPropsWithoutRef<"label"> &
                        React.RefAttributes<HTMLLabelElement>
        >

        export const FieldControl: React.ForwardRefExoticComponent<
                React.ComponentPropsWithoutRef<"div"> & React.RefAttributes<HTMLDivElement>
        >

        export const FieldDescription: React.ForwardRefExoticComponent<
                React.ComponentPropsWithoutRef<"p"> & React.RefAttributes<HTMLParagraphElement>
        >

        export const FieldError: React.ForwardRefExoticComponent<
                React.ComponentPropsWithoutRef<"p"> & React.RefAttributes<HTMLParagraphElement>
        >
}
