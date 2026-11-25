/** `'A', 'B'`: the SQL list of a fixed set of values, for the CHECKs of design doc I5. */
export function sqlList(values: readonly string[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

/** The values of a fixed list of `{ value, label }` items, in list order. */
export function valuesOf(list: readonly { value: string }[]): string[] {
  return list.map(({ value }) => value);
}
