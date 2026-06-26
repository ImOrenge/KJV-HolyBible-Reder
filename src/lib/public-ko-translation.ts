export const DEFAULT_PUBLIC_KO_TRANSLATION_NAME = "KJV Reader Note";

export function getConfiguredPublicKoTranslationName() {
  const configured =
    process.env.KJV_PUBLIC_KO_TRANSLATION_NAME ??
    process.env.NEXT_PUBLIC_KJV_PUBLIC_KO_TRANSLATION_NAME;

  return configured?.trim() || null;
}

export function isConfiguredPublicKoTranslation(translationName: string) {
  const configured = getConfiguredPublicKoTranslationName();
  return Boolean(configured && translationName === configured);
}
