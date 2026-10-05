import { register } from "node:module"

/*
  The app imports everything through the `@/` path alias, which Next resolves
  from tsconfig. Node's type stripping does not read tsconfig, so without this a
  test could only load modules with no value imports at all. Loaded with
  `--import` from the `test` script.
*/
register("./alias-hooks.mjs", import.meta.url)
