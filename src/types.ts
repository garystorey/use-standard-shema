import { StandardSchemaV1 } from "@standard-schema/spec";

export type SchemaField = {
  label: string;
  description: string;
  defaultValue: string;
  schema: StandardSchemaV1;
};

export type SchemaMap = {
  [key: string]: SchemaField | SchemaMap;
};

export type DotPaths<T, Prev extends string = ""> = {
  [K in keyof T]: T[K] extends SchemaField
    ? `${Prev}${K & string}`
    : T[K] extends object
    ? DotPaths<T[K], `${Prev}${K & string}.`>
    : never;
}[keyof T];
