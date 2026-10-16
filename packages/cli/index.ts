#!/usr/bin/env node
import { runCli } from "disposabl-kit/cli";
import config from "../../platforms.config";
import spec from "../../generated/openapi.json";
import pkg from "./package.json";

await runCli(spec, {
  ...config,
  version: pkg.version,
  packageName: pkg.name,
});
