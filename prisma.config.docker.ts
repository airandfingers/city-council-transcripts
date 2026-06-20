import dotenv from "dotenv";
// Override DATABASE_URL with local Docker Postgres for schema pushes during local dev.
// Usage: npx prisma db push --config prisma.config.docker.ts
dotenv.config({ path: ".env.docker", override: true });

const prismaConfig = {
  schema: "prisma/schema.prisma",
};

export default prismaConfig;
