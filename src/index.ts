import { useState, useCallback, FormEvent, FocusEvent, useMemo } from "react";
import { StandardSchemaV1 } from "@standard-schema/spec";

export type SchemaMap = Record<
  string,
  {
    label: string;
    description: string;
    defaultValue: string;
    schema: StandardSchemaV1;
  }
>;

export function defineSchema<T extends SchemaMap>(schema: T) {
  return schema;
}

export function useStandardSchema<T extends SchemaMap>(schemaMap: T) {
  type Errors = { [K in keyof T]?: string };
  type Flags = { [K in keyof T]?: boolean };
  type FormValues = { [K in keyof T]: T[K]["defaultValue"] };

  const initialData = useMemo(() => {
    return Object.fromEntries(
      Object.entries(schemaMap).map(([k, v]) => [k, v.defaultValue])
    ) as FormValues;
  }, [schemaMap]);

  const [data, setData] = useState<FormValues>(initialData);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Flags>({});
  const [dirty, setDirty] = useState<Flags>({});

  const validateField = useCallback(
    async (key: keyof T, value: any, force = false) => {
      const result = await schemaMap[key].schema["~standard"].validate(
        value.trim()
      );

      const message = result?.issues?.[0]?.message ?? "";

      setErrors((prev) => {
        const isFieldDirty = dirty[key] || force;
        return isFieldDirty ? { ...prev, [key]: message } : prev;
      });
    },
    [schemaMap, dirty]
  );

  const getForm = useCallback(
    (onSubmitHandler: (data: FormValues) => void) => {
      const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const newErrors: Errors = {};

        await Promise.all(
          (Object.keys(schemaMap) as (keyof T)[]).map(async (key) => {
            const result = await schemaMap[key].schema["~standard"].validate(
              data[key]
            );
            if (result && result.issues) {
              newErrors[key] = result.issues[0]?.message ?? "Validation error";
            } else {
              newErrors[key] = "";
            }
          })
        );

        setErrors(newErrors);

        const hasError = Object.values(newErrors).some((msg) => msg !== "");
        if (hasError) return;

        onSubmitHandler(data);
      };

      const onFocus = (e: FocusEvent) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;

        const field = target.name as keyof T;
        if (!field || !(field in schemaMap)) return;

        setTouched((prev) => ({ ...prev, [field]: true }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
      };

      const onBlur = async (e: FocusEvent) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;

        const field = target.name as keyof T;
        if (!field || !(field in schemaMap)) return;

        const value = target.value;
        const isDirty = value !== initialData[field];

        setTouched((prev) => ({ ...prev, [field]: true }));
        setData((prev) => ({ ...prev, [field]: value }));

        if (isDirty) {
          setDirty((prev) => ({ ...prev, [field]: true }));
          await validateField(field, value, true); // Force validation since dirty isn't updated yet
        }
      };

      return { onSubmit, onFocus, onBlur };
    },
    [schemaMap, data, validateField]
  );

  const getField = useCallback(
    <K extends keyof FormValues>(name: K) => {
      return {
        ...schemaMap[name],
        name,
        defaultValue: data[name],
        error: errors[name] ?? "",
        touched: !!touched[name],
        dirty: !!dirty[name],
      };
    },
    [data, errors, touched, dirty, schemaMap]
  );

  return {
    getForm,
    getField,
    errors,
    dirty,
    touched,
  };
}
