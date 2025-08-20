export function parsePagination(query) {
  const page = Math.max(1, Number(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
  const skip = (page - 1) * limit;
  const sortField = String(query.sort ?? "createdAt");
  const order = String(query.order ?? "desc").toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortField]: order };
  return { page, limit, skip, sort };
}
