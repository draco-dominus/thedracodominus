import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The spatial layer runs inside the WebGL frame loop, outside React
    // rendering. It intentionally mutates frame-loop objects (shader uniforms,
    // springs, and a shared input "bus") from useFrame and event handlers,
    // which is the idiomatic React Three Fiber pattern. The React Compiler is
    // not enabled for this project, so these rules don't apply here.
    files: ["src/components/spatial/**"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
