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
		"things_update",
		{
			title: "Update Thing",
			description:
				"Edit an existing item in place. Requires a thingId, from levels_list_things or an add call \u2014 a learnableId is rejected. Pass only the cells you want to change, by name ({'Definition': 'hello'}) or numeric key; the rest are left alone. Memrise writes one cell per request and reports nothing useful, so the row is read back afterwards and success means the new values are really there.",
			inputSchema: {
				thingId: z
					.union([z.string(), z.number()])
					.describe("Thing ID (NOT a learnable ID)."),
				columns: z
					.record(z.string())
					.refine((value) => Object.keys(value).length > 0, {
						message: "Give at least one cell to overwrite.",
					})
					.describe(
						"Cells to overwrite, by name or numeric key \u2014 attribute names when cellType is 'attribute'. e.g. {'Definition': 'hello'}. Unlisted cells keep their current value.",
					),
				cellType: z
					.enum(["column", "attribute"])
					.optional()
					.describe(
						"Which family of cells to write. Columns (Word, Definition, ...) are the default; attributes (Pronunciation, Gender, ...) are the extra fields that are shown but not tested.",
					),
				poolId: z
					.union([z.string(), z.number()])
					.optional()
					.describe(
						"Pool the item belongs to, from levels_list. Optional, and only used when cells are named: it saves the request that would otherwise look the pool up. Memrise rate-limits the account, so pass it when you have it.",
					),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: true,
			},
		},
		async ({ thingId, columns, cellType, poolId }) => {
			// Catch a learnableId here so the error can name the right thingId,
			// rather than reporting a confusing "no such column".
			assertThingId(Number(thingId), "things_update");

			const res = await withMemrise((client) =>
				client.updateThing(thingId, columns, { cellType, poolId }),
			);
			return jsonResult({
				success: res.success,
				verified: res.verified,
				thingId: Number(res.thingId),
				cellType: cellType ?? "column",
				updated: res.updated,
			});
		},
	);

	server.registerTool(
		"things_get",
		{
			title: "Get Thing",
			description:
				"Read one item by thingId, with every column and attribute \u2014 not just the pair a level tests. Use this to see current values before things_update.",
			inputSchema: {
				thingId: z
					.union([z.string(), z.number()])
					.describe("Thing ID (NOT a learnable ID)."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ thingId }) => {
			assertThingId(Number(thingId), "things_get");
			const res = await withMemrise((client) => client.getThing(thingId));
			if (!res?.thing) throw new Error(`Thing ${thingId} not found.`);
			return jsonResult(normalizeThing(res.thing));
		},
	);

	server.registerTool(
		"things_detach_from_level",
		{
			title: "Detach Thing from Level",
			description:
				"Take an item out of one level. This is a detach, not a delete: the pool row survives, so any other level sharing it keeps it, and the row can be re-attached. Use things_delete to destroy the row itself. Requires a thingId, from levels_list_things or an add call — a learnableId is rejected. Confirms the item is in the level before detaching and gone from it afterwards, so success means it is really out.",
			inputSchema: {
				courseId: z
					.union([z.string(), z.number()])
					.describe("Course ID owning the level. Used to verify the detach."),
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
			assertThingId(Number(thingId), "things_detach_from_level");

			const wanted = String(thingId);
			const result = await withMemrise(async (client) => {
				const before = await client.getLevelThingIds(courseId, levelId);
				if (!before.some((id) => String(id) === wanted)) {
					throw new Error(
						`thingId ${wanted} is not in level ${levelId}. Nothing was detached. Use levels_list_things to see what is there.`,
					);
				}

				// Detach by the caller's thingId, never a derived one.
				const response = await client.detachThingFromLevel(levelId, thingId);

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
						`Detach reported ${JSON.stringify(response.success)} but thingId ${wanted} is still in level ${levelId}. The item was NOT detached.`,
					);
				}

				return {
					success: true as const,
					verified: true as const,
					detachedThingId: Number(thingId),
					levelCountBefore: before.length,
					levelCountAfter: after.length,
				};
			});
			return jsonResult(result);
		},
	);

	server.registerTool(
		"things_delete",
		{
			title: "Delete Thing",
			description:
				"Destroy an item's pool row outright. Every level of a course shares one pool, so the row disappears from EVERY level using it at once, and this cannot be undone. To take a word out of one lesson and leave it elsewhere, use things_detach_from_level instead. Check courses_get_items for the item's levelIds before calling, to see which levels would lose it. Requires a thingId, from levels_list_things or an add call — a learnableId is rejected. Deleting the same thingId twice fails: the row is already gone. The row is read back afterwards, so success means it is really deleted.",
			inputSchema: {
				thingId: z
					.union([z.string(), z.number()])
					.describe("Thing ID of the pool row to destroy (NOT a learnable ID)."),
			},
			annotations: {
				destructiveHint: true,
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ thingId }) => {
			// Catch a learnableId here so the error names the right thingId,
			// rather than destroying nothing and reporting a bare 404.
			assertThingId(Number(thingId), "things_delete");

			const result = await withMemrise(async (client) => {
				const response = await client.deleteThing(thingId);

				// A deleted row 404s on read, which is the outcome we want.
				// Any other failure says nothing either way, so it must not
				// be read as proof the row is gone.
				const stillThere = await client
					.getThing(thingId)
					.then((read) => Boolean(read?.thing))
					.catch((error: unknown) => {
						if (
							(error as { response?: { status?: number } })?.response
								?.status === 404
						) {
							return false;
						}
						throw new Error(
							`Delete reported ${JSON.stringify(response.success)} for thingId ${thingId}, but reading the row back failed, so the outcome is unconfirmed: ${error instanceof Error ? error.message : String(error)}. Re-check with things_get before deleting again.`,
						);
					});
				if (stillThere) {
					throw new Error(
						`Delete reported ${JSON.stringify(response.success)} but thingId ${thingId} still exists. The item was NOT deleted.`,
					);
				}

				return {
					success: true as const,
					verified: true as const,
					deletedThingId: Number(thingId),
				};
			});
			return jsonResult(result);
		},
	);

	server.registerTool(
		"things_list_orphans",
		{
			title: "List Orphaned Things",
			description:
				"List a course's orphaned pool rows: items that exist in the pool but are attached to no level, which is what detaching an item from its last level leaves behind. They are invisible to levels_list_things and pools_search, and things_delete is what clears them. SLOW: this scrapes the editor's database pages, roughly one request per 20 pool rows, so a large course takes many requests. Returns each row's thingId and its column values in column order.",
			inputSchema: {
				courseId: z
					.union([z.string(), z.number()])
					.describe("Course ID whose pool to scan."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ courseId }) => {
			const orphans = await withMemrise((client) =>
				client.findOrphanedThings(courseId),
			);
			return jsonResult({
				count: orphans.length,
				orphans: orphans.map((thing) => ({
					thingId: Number(thing.thingId),
					values: thing.values,
				})),
			});
		},
	);
}
