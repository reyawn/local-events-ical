interface Env {
  CALENDAR_TTL?: string;
}

declare module "*.html?raw" {
  const value: string;
  export default value;
}
