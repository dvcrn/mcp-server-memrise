import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { ID_GLOSSARY, normalizeSearchHit } from "../ids";
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
			description: `Search for items in a pool (e.g. to avoid duplicates). Returns thingIds, which are what things_delete_from_level requires. CRITICAL: You must search using numeric column keys (e.g., {'1': 'Hola'}). Fetch course columns with courses_get_columns first. This is a filtered search only — Memrise has no 'return everything' mode, so at least one column value is required and an empty filter is rejected. To list a whole level, use levels_list_things. ${ID_GLOSSARY}`,
			inputSchema: {
				poolId: z.union([z.string(), z.number()]).describe("Pool ID."),
				columns: z
					.record(z.string().min(1))
					.refine((value) => Object.keys(value).length > 0, {
						message:
							"At least one column is required. Memrise cannot search a pool without a term — use levels_list_things to enumerate a level.",
					})
					.describe(
						"Columns to search for, at least one non-empty. e.g. {'1': 'hola'}",
					),
				excludeThingIds: z
					.array(z.string())
					.optional()
					.describe("Exclude specific thing IDs."),
				originalOnly: z.boolean().optional().describe("Search original only."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ poolId, columns, excludeThingIds, originalOnly }) => {
			const res = await withMemrise((client) =>
				client.searchPool(
					poolId,
					columns,
					excludeThingIds ?? [],
					originalOnly ?? false,
				),
			);
			return jsonResult(res.result.map(normalizeSearchHit));
		},
	);
}
