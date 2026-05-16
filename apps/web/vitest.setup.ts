import { resolve } from "node:path";
import { loadDatabaseEnv } from "@avenire/database/load-env";

loadDatabaseEnv({
  packageRootDir: resolve(process.cwd(), "../../packages/database"),
});
