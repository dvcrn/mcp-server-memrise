import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { assertThingId } from "memrise";
import type { BulkAddResponse } from "memrise/dist/types";
import { z } from "zod";
import { withMemrise } from "../client";
import {
	normalizeLearnable,
	normalizeThing,
	LEVEL_ID_HINT,
} from "../ids";
import { jsonResult } from "../results";

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
			description: `Add one thing (item) to a level. Columns may be given by name ({'Word': 'hola'}) or by numeric key ({'1': 'hola'}); names are resolved for you. Returns the new thingId.`,
			inputSchema: {
				levelId: z
					.union([z.string(), z.number()])
					.describe(`Level ID. ${LEVEL_ID_HINT}`),
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
		"things_bulk_add_to_level",
		{
			title: "Bulk Add Things to Level",
			description: `Add many things (items) to a level in one request. Prefer this over calling things_add_to_level in a loop. Columns may be given by name ({'Word': 'hola'}) or by numeric key. Returns the new thingIds.`,
			inputSchema: {
				levelId: z
					.union([z.string(), z.number()])
					.describe(`Level ID. ${LEVEL_ID_HINT}`),
				items: bulkItemsSchema,
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ levelId, items }) => {
			const res = await withMemrise((client) =>
				client.bulkAddToLevel(levelId, items),
			);
			return bulkAddResult(res);
		},
	);

	server.registerTool(
		"things_bulk_add_to_pool",
		{
			title: "Bulk Add Things to Pool",
			description: `Add many things (items) to a pool without attaching them to any level. Use things_bulk_add_to_level if the items should appear in a lesson. Columns may be given by name or numeric key.`,
			inputSchema: {
				poolId: z.union([z.string(), z.number()]).describe("Pool ID."),
				items: bulkItemsSchema,
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ poolId, items }) => {
			const res = await withMemrise((client) =>
				client.bulkAddToPool(poolId, items),
			);
			return bulkAddResult(res);
		},
	);

	server.registerTool(
		"learnables_get",
		{
			title: "Get Learnable",
			description: `Get one learnable item by its learnableId. The response includes the matching thingId.`,
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
			description:
				"Remove an item from a level. Requires a thingId, from levels_list_things or an add call — a learnableId is rejected. Confirms the item is in the level before deleting and gone afterwards, so success means it is really gone.",
			inputSchema: {
				courseId: z
					.union([z.string(), z.number()])
					.describe("Course ID owning the level. Used to verify the delete."),
				levelId: z
					.union([z.string(), z.number()])
					.describe(`Level ID. ${LEVEL_ID_HINT}`),
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
						`thingId ${wanted} is not in level ${levelId}. Nothing was deleted. Use levels_list_things to see what is there.`,
					);
				}

				// Delete by the caller's thingId, never a derived one.
				const response = await client.deleteThingFromLevel(levelId, thingId);

				// Removing the last item empties the level, and the levels
				// endpoint omits empty levels -- so a lookup failure here means
				// the level is now empty, which is the outcome we wanted.
				const after = await client
					.getLevelThingIds(courseId, levelId)
					.catch((error: unknown) => {
						if (before.length === 1) return [];
						throw error;
					});
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
