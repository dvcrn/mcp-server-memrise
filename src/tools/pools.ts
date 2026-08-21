import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { normalizeSearchHit } from "../ids";
import { jsonResult } from "../results";

export function registerPoolTools(server: McpServer): void {
	server.registerTool(
		"pools_get",
		{
			title: "Get Pool",
			description:
				"Get a pool by ID. Pools are the backend databases for course levels.",
			inputSchema: {
				poolId: z.union([z.string(), z.number()]).describe("Pool ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ poolId }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getPool(poolId),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"pools_search",
		{
			title: "Search Pool",
			description: `Search a pool for matching items, e.g. to avoid adding duplicates. Returns thingIds. Search terms are given per column, by name or numeric key ({'Word': 'Hola'}). This is a filtered search only: Memrise has no 'return everything' mode, so at least one term is required. To list a whole level, use levels_list_things.`,
			inputSchema: {
				poolId: z.union([z.string(), z.number()]).describe("Pool ID."),
				columns: z
					.record(z.string().min(1))
					.refine((value) => Object.keys(value).length > 0, {
						message:
							"At least one column is required. Memrise cannot search a pool without a term — use levels_list_things to enumerate a level.",
					})
					.describe(
						"Columns to search, at least one non-empty. e.g. {'Word': 'hola'}",
					),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ poolId, columns }) => {
			const res = await withMemrise((client) =>
				client.searchPool(poolId, columns),
			);
			return jsonResult(res.result.map(normalizeSearchHit));
		},
	);
}
