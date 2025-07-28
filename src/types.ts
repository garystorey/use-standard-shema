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

type DotPathsToValues<T, Prev extends string = ""> = {
  [K in keyof T]: T[K] extends SchemaField
    ? { [P in `${Prev}${K & string}`]: T[K]["defaultValue"] }
    : T[K] extends SchemaMap
    ? DotPathsToValues<T[K], `${Prev}${K & string}.`>
    : {};
}[keyof T];

export type FormValues<T extends SchemaMap> = {
  [K in keyof DotPathsToValues<T>]: DotPathsToValues<T>[K];
};
