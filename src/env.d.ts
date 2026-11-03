interface Env {
  CALENDAR_TTL?: string;
  AFVALWIJZER_ORIGIN?: string;
}

declare module "*.html?raw" {
  const value: string;
  export default value;
}
