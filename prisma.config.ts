import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Tell the CLI to bypass the pooler and use the Direct Connection (Port 5432)
    url: env("DIRECT_URL"),
  },
});