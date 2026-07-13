export type StudyPageSearchParams = Record<string, string | string[] | undefined>;

export function toStudyUrlSearchParams(input: StudyPageSearchParams | undefined) {
  const output = new URLSearchParams();
  for (const [key, value] of Object.entries(input ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => output.append(key, item));
    } else if (value !== undefined) {
      output.set(key, value);
    }
  }
  return output;
}
