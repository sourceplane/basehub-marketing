// Answers a BaseHub query from the sample content tree.
//
// A BaseHub query is a selection object (`{ site: { blog: { posts: { items:
// { _title: true } } } } }`), the same object the SDK turns into GraphQL.
// Projecting the sample tree onto it returns exactly the shape the real API
// would: the fields asked for and nothing else, arrays mapped, union members
// chosen by `on_<Type>` against each node's `__typename`, and a collection's
// `__args` (`filter`, `orderBy`, `first`, `skip`) applied to its `items`.
// Only the argument forms this site's queries use are implemented; anything
// else is ignored rather than guessed at.

type Selection = Record<string, unknown>;

type Node = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldOf(item: Node, key: string): unknown {
  // `_sys_slug` filters on the item's system slug, which the tree keeps as
  // `_slug` (and `_sys.slug`).
  if (key === "_sys_slug") {
    const sys = item._sys as Node | undefined;
    return sys?.slug ?? item._slug;
  }
  return item[key];
}

function matches(item: Node, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (!isObject(condition)) return fieldOf(item, key) === condition;
    return Object.entries(condition).every(([op, expected]) => {
      const actual = fieldOf(item, key);
      switch (op) {
        case "eq":
          return actual === expected;
        case "notEq":
          return actual !== expected;
        case "in":
          return Array.isArray(expected) && expected.includes(actual);
        default:
          return true;
      }
    });
  });
}

function applyCollectionArgs(items: Node[], args: Record<string, unknown>): Node[] {
  let out = [...items];
  if (isObject(args.filter)) out = out.filter((item) => matches(item, args.filter as Record<string, unknown>));
  if (typeof args.orderBy === "string") {
    const [field, direction] = args.orderBy.split("__");
    const dir = direction === "DESC" ? -1 : 1;
    out.sort((a, b) => {
      const x = String(a[field!] ?? "");
      const y = String(b[field!] ?? "");
      return x < y ? -dir : x > y ? dir : 0;
    });
  }
  if (typeof args.skip === "number") out = out.slice(args.skip);
  if (typeof args.first === "number") out = out.slice(0, args.first);
  return out;
}

export function project(node: unknown, selection: unknown): unknown {
  if (node === undefined || node === null) return null;
  // A scalar answers its own value whatever the selection (`true`, `1`, or a
  // scalar asked for with `__args`, like an image `url` with a width).
  if (!isObject(node) && !Array.isArray(node)) return node;
  if (Array.isArray(node)) return node.map((n) => project(n, selection));
  // `json: { content: true }` asks for a JSON scalar whole.
  if (!isObject(selection)) return node;

  let source: Node = node;
  const args = selection.__args;
  if (isObject(args) && Array.isArray(node.items)) {
    source = { ...node, items: applyCollectionArgs(node.items as Node[], args) };
  }

  const out: Record<string, unknown> = {};
  for (const [key, sub] of Object.entries(selection as Selection)) {
    if (key === "__args" || (key.startsWith("__") && key !== "__typename")) continue;
    if (key === "__typename") {
      out.__typename = source.__typename ?? null;
      continue;
    }
    if (key.startsWith("on_")) {
      if (source.__typename === key.slice(3) && isObject(sub)) {
        Object.assign(out, project(source, sub) as Record<string, unknown>);
      }
      continue;
    }
    out[key] = project(source[key], sub);
  }
  return out;
}
