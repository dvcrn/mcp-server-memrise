import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { jsonResult } from "../results";

export function registerPoolTools(server: McpServer): void {
	server.registerTool(
		"memrise_pools_get",
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
		"memrise_pools_search",
		{
			title: "Search Pool",
			description:
				"Search for items in a pool (e.g. to avoid duplicates). CRITICAL: You must search using numeric column keys (e.g., {'1': 'Hola'}). Fetch course columns with memrise_courses_get_columns first.",
			inputSchema: {
				poolId: z.union([z.string(), z.number()]).describe("Pool ID."),
				columns: z
					.record(z.string())
					.describe("Columns to search for. e.g. {'1': 'hola'}"),
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
		async ({ poolId, columns, excludeThingIds, originalOnly }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.searchPool(
						poolId,
						columns,
						excludeThingIds ?? [],
						originalOnly ?? false,
					),
				)) as unknown as Record<string, unknown>,
			),
	);
}
