const PII_KEYS = new Set<string>([]);


export function redactPII<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== "object") {
    return input;
  }

  if (Array.isArray(input)) {
    const arr: any[] = [];
    for (const el of input) {
      arr.push(redactPII(el));
    }
    return arr as unknown as T;
  }

  const output: any = {};
  for (const key of Object.keys(input as any)) {
    if (PII_KEYS.has(key)) {
      output[key] = "[REDACTED]";
    } else {
      const val = (input as any)[key];
      output[key] = redactPII(val);
    }
  }
  return output as T;
}
