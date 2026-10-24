// The 4xx replies every API route shares.
export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401 });
export const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });
export const notFound = () => Response.json({ error: "Not found" }, { status: 404 });
export const conflict = () => Response.json({ error: "A bucket with this name already exists" }, { status: 409 });
