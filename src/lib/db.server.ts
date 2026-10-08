import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export function getDatabase() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  // Reuse a small pool across requests; Render's single instance and Neon compute
  // are intentionally kept within conservative connection limits.
  client ??= postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
    prepare: false,
  });
  return client;
}
