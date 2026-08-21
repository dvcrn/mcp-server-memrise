import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { assertThingId } from "memrise";
import type { BulkAddResponse } from "memrise/dist/types";
import { z } from "zod";
import { withMemrise } from "../client";
import {
	ID_GLOSSARY,
	normalizeLearnable,
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
		"Items to add. Each item is a record keyed by column name or number ({'Word': 'hola', 'Definition': 'hello'}) or an ordered value array (['hola', 'hello']).",
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
			description: `Add one thing (item) to a level. Columns may be given by name ({'Word': 'hola'}) or by numeric key ({'1': 'hola'}); names are resolved for you. Returns the new thingId. ${ID_GLOSSARY}`,
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
				columns: z
					.record(z.string())
					.describe("Column values, by name or numeric key. e.g. {'Word': 'hola', 'Definition': 'hello'}"),
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
		"things_add_by_level_number",
		{
			title: "Add Thing by Level Number",
			description:
				"Add one thing (item) to a course, choosing the level by the number Memrise shows in the editor. Columns may be given by name or numeric key.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				columns: z.record(z.string()).describe("Column values, by name or numeric key."),
				levelNumber: z
					.number()
					.int()
					.positive()
					.optional()
					.describe(
						"Level number as shown in the Memrise editor (1-based). Defaults to 1.",
					),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ courseId, columns, levelNumber }) => {
			const res = await withMemrise((client) =>
				client.addThingToCourse(courseId, columns, levelNumber ?? 1),
			);
			return jsonResult({ success: res.success, ...normalizeThing(res.thing) });
		},
	);

	server.registerTool(
		"things_bulk_add_to_level",
		{
			title: "Bulk Add Things to Level",
			description: `Add many things (items) to a level in one request. Prefer this over calling things_add_to_level in a loop. Columns may be given by name ({'Word': 'hola'}) or by numeric key. Returns the new thingIds. ${ID_GLOSSARY}`,
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
		"things_bulk_add_by_level_number",
		{
			title: "Bulk Add Things by Level Number",
			description:
				"Add many things (items) to a course in one request, choosing the level by the number Memrise shows in the editor. Columns may be given by name or numeric key.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				items: bulkItemsSchema,
				levelNumber: z
					.number()
					.int()
					.positive()
					.optional()
					.describe(
						"Level number as shown in the Memrise editor (1-based). Defaults to 1.",
					),
				delimiter: bulkDelimiterSchema,
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ courseId, items, levelNumber, delimiter }) => {
			const res = await withMemrise((client) =>
				client.bulkAddToCourse(courseId, items, levelNumber ?? 1, delimiter),
			);
			return bulkAddResult(res);
		},
	);

	server.registerTool(
		"things_bulk_add_to_pool",
		{
			title: "Bulk Add Things to Pool",
			description: `Add many things (items) to a pool without attaching them to any level. Use things_bulk_add_to_level if the items should appear in a lesson. Columns may be given by name or numeric key. ${ID_GLOSSARY}`,
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
			description: `Get one learnable item by its learnableId. The response includes the matching thingId. ${ID_GLOSSARY}`,
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
			description: `Remove a thing (item) from a specific level. Requires a thingId (from levels_list_things, pools_search or things_add_to_level) — passing a learnableId will fail. Confirms the thing is in the level before deleting and that it is gone afterwards, so a reported success means the item is really gone. ${ID_GLOSSARY}`,
			inputSchema: {
				courseId: z
					.union([z.string(), z.number()])
					.describe("Course ID owning the level. Used to verify the delete."),
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
		async ({ courseId, levelId, thingId }) => {
			// Catch a learnableId here so the error can name the right thingId,
			// rather than reporting a confusing "not in level".
			assertThingId(Number(thingId), "things_delete_from_level");

			const wanted = String(thingId);
			const result = await withMemrise(async (client) => {
				const before = await client.getLevelThingIds(courseId, levelId);
				if (!before.some((id) => String(id) === wanted)) {
					throw new Error(
						`thingId ${wanted} is not in level ${levelId}. Nothing was deleted. Use levels_list_things to see what is there. ${ID_GLOSSARY}`,
					);
				}

				// Delete by the caller's thingId, never a derived one.
				const response = await client.deleteThingFromLevel(levelId, thingId);

				const after = await client.getLevelThingIds(courseId, levelId);
				if (after.some((id) => String(id) === wanted)) {
					throw new Error(
						`Delete reported ${JSON.stringify(response.success)} but thingId ${wanted} is still in level ${levelId}. The item was NOT removed.`,
					);
				}

				return {
					success: true as const,
					verified: true as const,
					deletedThingId: Number(thingId),
					levelCountBefore: before.length,
					levelCountAfter: after.length,
				};
			});
			return jsonResult(result);
		},
	);
}
