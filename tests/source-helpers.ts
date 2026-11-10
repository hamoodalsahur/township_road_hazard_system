import { readFileSync } from "node:fs";

/**
 * Reads a source file with the spaces around code punctuation removed, so source checks
 * keep testing the same rules when code is reformatted (for example `a === b` and `a===b`).
 * Spaces inside words and labels are kept, so text like "Reason for decision" still matches.
 */
export function readCompactSource(path: string): string {
  return readFileSync(path, "utf8").replace(/\s*([=:;,&|?.(){}\[\]<>!+*\/-])\s*/g, "$1");
}
