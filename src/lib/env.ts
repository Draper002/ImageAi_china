const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BAILIAN_API_KEY",
  "NEXT_PUBLIC_APP_URL"
] as const;

const optionalDefaults = {
  BAILIAN_IMAGE_MODEL: "wan2.7-image-pro",
  BAILIAN_API_BASE_URL: "https://dashscope.aliyuncs.com/api/v1"
} as const;

export type AppEnv = Record<(typeof requiredKeys)[number], string> &
  Record<keyof typeof optionalDefaults, string>;
const supabasePublicKeys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export function hasSupabasePublicConfig(
  source: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
) {
  return supabasePublicKeys.every((key) => Boolean(source[key]));
}

export function parseEnv(source: NodeJS.ProcessEnv | Record<string, string | undefined>): AppEnv {
  const values = { ...optionalDefaults } as AppEnv;

  for (const key of requiredKeys) {
    const value = source[key];
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    values[key] = value;
  }

  for (const key of Object.keys(optionalDefaults) as Array<keyof typeof optionalDefaults>) {
    values[key] = source[key] || optionalDefaults[key];
  }

  return values;
}

export function getEnv(): AppEnv {
  return parseEnv(process.env);
}
