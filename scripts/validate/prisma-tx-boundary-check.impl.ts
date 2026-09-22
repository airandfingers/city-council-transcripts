/**
 * FIX-NEON-HTTP-ADAPTER-001: the default Prisma client talks to Neon over HTTP,
 * which cannot open a transaction. Prisma opens an *implicit* transaction for
 * `upsert`, `createMany`, `updateMany`, any nested relation write, and any
 * `$transaction` — those must go through `prismaTx` (see app/lib/prisma.ts).
 *
 * Getting this wrong fails at request time in production, and nothing else
 * catches it: `next build` never touches the database (every
 * generateStaticParams returns [] on purpose), and there are no unit tests.
 * Hence this static guard, using the TypeScript AST rather than regex so it
 * can tell `prismaTx.x.upsert()` from `prisma.x.upsert()` and can see nested
 * writes inside a `data:` object.
 *
 * The operation split was established empirically against the live database,
 * not from documentation: reads (including deep relation loads, `count`,
 * `groupBy`), `create`, `update`, `delete` and `deleteMany` all work over HTTP;
 * `upsert`, `createMany` and `updateMany` reject with "Transactions are not
 * supported in HTTP mode".
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";

/** Methods Prisma always wraps in an implicit transaction. */
const TX_METHODS = new Set(["upsert", "createMany", "updateMany"]);
/** Keys that, inside a `data:` object, mean a nested relation write. */
const NESTED_WRITE_KEYS = new Set([
  "create", "createMany", "connectOrCreate", "upsert", "updateMany", "deleteMany", "set",
]);

type Finding = { file: string; line: number; detail: string };
const findings: Finding[] = [];

function walkDir(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      walkDir(p, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** `prisma.meeting.upsert` -> {root:"prisma", method:"upsert"}; ignores other shapes. */
function describeCallee(expr: ts.Expression): { root: string; method: string } | null {
  if (!ts.isPropertyAccessExpression(expr)) return null;
  const method = expr.name.text;
  const mid = expr.expression;
  // prisma.$transaction(...)
  if (ts.isIdentifier(mid)) return { root: mid.text, method };
  // prisma.<model>.<method>(...)
  if (ts.isPropertyAccessExpression(mid) && ts.isIdentifier(mid.expression)) {
    return { root: mid.expression.text, method };
  }
  return null;
}

function objectLiteralProp(obj: ts.ObjectLiteralExpression, key: string): ts.Expression | null {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
      if (p.name.text === key) return p.initializer;
    }
  }
  return null;
}

/** True if any value inside `data` is an object containing a relation-write key. */
function hasNestedWrite(dataExpr: ts.Expression): string | null {
  if (!ts.isObjectLiteralExpression(dataExpr)) return null;
  for (const prop of dataExpr.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const value = prop.initializer;
    if (!ts.isObjectLiteralExpression(value)) continue;
    for (const inner of value.properties) {
      if (!ts.isPropertyAssignment(inner)) continue;
      const name = ts.isIdentifier(inner.name) || ts.isStringLiteral(inner.name) ? inner.name.text : "";
      if (NESTED_WRITE_KEYS.has(name)) {
        const field = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : "?";
        return `${field}.${name}`;
      }
    }
  }
  return null;
}

for (const file of walkDir("app")) {
  const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const at = (n: ts.Node) => src.getLineAndCharacterOfPosition(n.getStart()).line + 1;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = describeCallee(node.expression);
      // Only the default client is constrained; prismaTx is the escape hatch.
      if (callee && callee.root === "prisma") {
        if (TX_METHODS.has(callee.method)) {
          findings.push({ file, line: at(node), detail: `prisma.*.${callee.method}() needs a transaction — use prismaTx` });
        } else if (callee.method === "$transaction") {
          findings.push({ file, line: at(node), detail: `prisma.$transaction() is unsupported over HTTP — use prismaTx` });
        } else if (callee.method === "create" || callee.method === "update") {
          const arg = node.arguments[0];
          if (arg && ts.isObjectLiteralExpression(arg)) {
            const data = objectLiteralProp(arg, "data");
            const nested = data ? hasNestedWrite(data) : null;
            if (nested) {
              findings.push({ file, line: at(node), detail: `nested relation write (data.${nested}) opens an implicit transaction — use prismaTx` });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
}

if (findings.length > 0) {
  console.error("prisma-tx-boundary-check: operations requiring a transaction found on the HTTP client\n");
  for (const f of findings) console.error(`  ${f.file}:${f.line}\n      ${f.detail}`);
  console.error(
    "\nThese throw \"Transactions are not supported in HTTP mode\" at request time.\n" +
      "Import { prismaTx } from \"@/app/lib/prisma\" and call it on that client instead.",
  );
  process.exit(1);
}

console.log("prisma-tx-boundary-check: no transaction-requiring operations on the HTTP client.");
