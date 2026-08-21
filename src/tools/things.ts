import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BulkAddResponse } from "memrise/dist/types";
import { z } from "zod";
import { withMemrise } from "../client";
import {
	ID_GLOSSARY,
	normalizeLearnable,
	normalizeLevelThing,
	normalizeThing,
} from "../ids";
import { jsonResult } from "../results";

const bulkDelimiterSchema = z
	.enum(["comma", "tab", "semicolon"])
	.optional()
	.describe(
		"Delimiter between column values. Defaults to comma. Values must not contain the chosen delimiter or newlines.",
	);

const bulkItemsSchema = z
	.array(z.union([z.record(z.string()), z.array(z.string())]))
	.min(1)
	.describe(
		"Items to add. Each item is a numeric-key record ({'1': 'hola', '2': 'hello'}) or an ordered value array (['hola', 'hello']). Call courses_get_columns first.",
	);

function bulkAddResult(res: BulkAddResponse) {
	return jsonResult({
		success: res.success,
		things: res.things.map(normalizeThing),
	});
}

export function registerThingTools(server: McpServer): void {
	server.registerTool(
		"things_add_to_level",
		{
			title: "Add Thing to Level",
			description: `Add a new thing (item) to a specific level by its ID. Returns the new thingId, which is what things_delete_from_level requires. CRITICAL: Memrise expects numeric keys for columns (e.g. '1', '2'), not strings like 'term'. You MUST call courses_get_columns first to map fields to numeric IDs. ${ID_GLOSSARY}`,
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
				columns: z
					.record(z.string())
					.describe("Item columns data. e.g. {'1': 'hola', '2': 'hello'}"),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ levelId, columns }) => {
			const res = await withMemrise((client) =>
				client.addThingToLevel(String(levelId), columns),
			);
			return jsonResult({ success: res.success, ...normalizeThing(res.thing) });
		},
	);

	server.registerTool(
		"things_add_by_level_index",
		{
			title: "Add Thing by Level Index",
			description:
				"Add a new thing (item) to a course at a specific level index. CRITICAL: Must use numeric column keys (e.g., {'1': 'val'}). Call courses_get_columns first. WARNING: levelIndex skips empty levels, causing off-by-N errors. SAFER PATTERN: resolve exact levelId via levels_list and use things_add_to_level instead.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				columns: z.record(z.string()).describe("Item columns data."),
				levelIndex: z
					.number()
					.int()
					.nonnegative()
					.optional()
					.describe("Level index (0-based). Defaults to 0."),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ courseId, columns, levelIndex }) => {
			const res = await withMemrise((client) =>
				client.addThingToCourse(courseId, columns, levelIndex ?? 0),
			);
			return jsonResult({ success: res.success, ...normalizeThing(res.thing) });
		},
	);

	server.registerTool(
		"things_bulk_add_to_level",
		{
			title: "Bulk Add Things to Level",
			description: `Add many things (items) to a specific level in one request. Returns thingIds, which are what things_delete_from_level requires. CRITICAL: Memrise expects numeric keys for columns (e.g. '1', '2'), not strings like 'term'. You MUST call courses_get_columns first to map fields to numeric IDs. Prefer this over calling things_add_to_level in a loop. ${ID_GLOSSARY}`,
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
				items: bulkItemsSchema,
				delimiter: bulkDelimiterSchema,
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ levelId, items, delimiter }) => {
			const res = await withMemrise((client) =>
				client.bulkAddToLevel(levelId, items, delimiter),
			);
			return bulkAddResult(res);
		},
	);

	server.registerTool(
		"things_bulk_add_by_level_index",
		{
			title: "Bulk Add Things by Level Index",
			description:
				"Add many things (items) to a course at a specific level index in one request. CRITICAL: Must use numeric column keys (e.g., {'1': 'val'}). Call courses_get_columns first. WARNING: levelIndex skips empty levels, causing off-by-N errors. SAFER PATTERN: resolve exact levelId via levels_list and use things_bulk_add_to_level instead.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				items: bulkItemsSchema,
				levelIndex: z
					.number()
					.int()
					.nonnegative()
					.optional()
					.describe("Level index (0-based). Defaults to 0."),
				delimiter: bulkDelimiterSchema,
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ courseId, items, levelIndex, delimiter }) => {
			const res = await withMemrise((client) =>
				client.bulkAddToCourse(courseId, items, levelIndex ?? 0, delimiter),
			);
			return bulkAddResult(res);
		},
	);

	server.registerTool(
		"things_bulk_add_to_pool",
		{
			title: "Bulk Add Things to Pool",
			description: `Add many things (items) to a pool database without attaching them to a level. Returns thingIds. CRITICAL: Must use numeric column keys (e.g., {'1': 'val'}). Call courses_get_columns first. Use things_bulk_add_to_level if the items should appear in a course level. ${ID_GLOSSARY}`,
			inputSchema: {
				poolId: z.union([z.string(), z.number()]).describe("Pool ID."),
				items: bulkItemsSchema,
				delimiter: bulkDelimiterSchema,
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ poolId, items, delimiter }) => {
			const res = await withMemrise((client) =>
				client.bulkAddToPool(poolId, items, delimiter),
			);
			return bulkAddResult(res);
		},
	);

	server.registerTool(
		"learnables_get",
		{
			title: "Get Learnable",
			description: `Get a specific learnable item by its ID. Returns a learnableId, NOT a thingId — you cannot pass this to things_delete_from_level. ${ID_GLOSSARY}`,
			inputSchema: {
				learnableId: z
					.union([z.string(), z.number()])
					.describe("Learnable ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ learnableId }) => {
			const res = await withMemrise((client) =>
				client.getLearnable(learnableId),
			);
			if (!res) throw new Error(`Learnable ${learnableId} not found.`);
			return jsonResult(normalizeLearnable(res));
		},
	);

	server.registerTool(
		"things_delete_from_level",
		{
			title: "Delete Thing from Level",
			description: `Remove a thing (item) from a specific level. Requires a thingId (from levels_list_things, pools_search or things_add_to_level) — passing a learnableId will fail. Verifies the thing is in the level before deleting and confirms removal after, so a reported success means the item is really gone. ${ID_GLOSSARY}`,
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
				thingId: z
					.union([z.string(), z.number()])
					.describe("Thing ID (NOT a learnable ID)."),
			},
			annotations: {
				destructiveHint: true,
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ levelId, thingId }) => {
			const wanted = String(thingId);
			const result = await withMemrise(async (client) => {
				const before = await client.getLevelThings(levelId);
				const target = before.find((t) => String(t.id) === wanted);
				if (!target) {
					throw new Error(
						`thingId ${wanted} is not in level ${levelId}. Nothing was deleted. If you passed a learnableId, it will not work here — find the thingId via levels_list_things. ${ID_GLOSSARY}`,
					);
				}

				const response = await client.deleteThingFromLevel(levelId, thingId);

				const after = await client.getLevelThings(levelId);
				const stillPresent = after.some((t) => String(t.id) === wanted);
				if (stillPresent) {
					throw new Error(
						`Delete reported ${JSON.stringify(response.success)} but thingId ${wanted} is still in level ${levelId}. The item was NOT removed.`,
					);
				}

				return {
					success: true as const,
					verified: true as const,
					deleted: normalizeLevelThing(target),
					levelCountBefore: before.length,
					levelCountAfter: after.length,
				};
			});
			return jsonResult(result);
		},
	);
}
