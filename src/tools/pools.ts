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
		"pools_set_column_settings",
		{
			title: "Set Pool Column Settings",
			description:
				"Update a pool column's display and testing settings. Applies to every level sharing the pool. Omitted fields keep their current value. To change which columns a level tests, use levels_set_column_pair instead.",
			inputSchema: {
				poolId: z.union([z.string(), z.number()]).describe("Pool ID."),
				column: z
					.union([z.string(), z.number()])
					.describe("Column, by label or numeric key. e.g. 'Word' or 1."),
				label: z
					.string()
					.min(1)
					.optional()
					.describe(
						"New column label. Renames the column across every level sharing the pool, and anything referring to it by the old name stops resolving.",
					),
				keyboard: z
					.string()
					.optional()
					.describe(
						"Characters forming the on-screen keyboard, e.g. 'abc def' where a space wraps to a new row. Empty string means the learner's own keyboard.",
					),
				showBigger: z
					.boolean()
					.optional()
					.describe("Render the text larger, e.g. for Chinese."),
				neverItalicize: z
					.boolean()
					.optional()
					.describe("Keep the text upright in contexts that italicize it."),
				typingDisabled: z
					.boolean()
					.optional()
					.describe("Suppress typing tests for this column."),
				tappingDisabled: z
					.boolean()
					.optional()
					.describe("Suppress tapping ('rearrange the words') tests."),
				typingStrict: z
					.boolean()
					.optional()
					.describe(
						"Mark typing without ignoring spacing, capitalization or accents.",
					),
				alwaysShow: z
					.boolean()
					.optional()
					.describe("Display the column even when it is not tested on."),
				showAfterTests: z
					.boolean()
					.optional()
					.describe("Display the column after a test."),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: true,
			},
		},
		async ({ poolId, column, ...settings }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.setPoolColumnSettings(poolId, column, settings),
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
