export type HelloLocale =
  | "ar"
  | "en"
  | "es"
  | "hi"
  | "it"
  | "ja"
  | "vi"
  | "zh-Hans";

const COUNTRY_LOCALE_MAP: Partial<Record<string, HelloLocale>> = {
  AR: "es",
  BO: "es",
  CL: "es",
  CN: "zh-Hans",
  CO: "es",
  CR: "es",
  CU: "es",
  DO: "es",
  EC: "es",
  ES: "es",
  GT: "es",
  HN: "es",
  IN: "hi",
  IT: "it",
  JP: "ja",
  MX: "es",
  NI: "es",
  PA: "es",
  PE: "es",
  PR: "es",
  PY: "es",
  SV: "es",
  UY: "es",
  VE: "es",
  VN: "vi",
};

function normalizeLocale(input: string): HelloLocale | null {
  const locale = input.toLowerCase();
  if (locale.startsWith("ar")) {
    return "ar";
  }
  if (locale.startsWith("es")) {
    return "es";
  }
  if (locale.startsWith("hi")) {
    return "hi";
  }
  if (locale.startsWith("it")) {
    return "it";
  }
  if (locale.startsWith("ja")) {
    return "ja";
  }
  if (locale.startsWith("vi")) {
    return "vi";
  }
  if (locale.startsWith("zh")) {
    return "zh-Hans";
  }
  if (locale.startsWith("en")) {
    return "en";
  }
  return null;
}

export function resolveAppleHelloLocale(
  languages: readonly string[]
): HelloLocale {
  for (const language of languages) {
    const region = language.split("-")[1]?.toUpperCase();
    if (region) {
      const locale = COUNTRY_LOCALE_MAP[region];
      if (locale) {
        return locale;
      }
    }
  }

  for (const language of languages) {
    const locale = normalizeLocale(language);
    if (locale) {
      return locale;
    }
  }
  return "en";
}

export function resolveAppleHelloLocaleFromCountry(
  countryCode: string | null | undefined
): HelloLocale | null {
  if (!countryCode) {
    return null;
  }
  return COUNTRY_LOCALE_MAP[countryCode.toUpperCase()] ?? null;
}
