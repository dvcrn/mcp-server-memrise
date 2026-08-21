import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import {
	ID_GLOSSARY,
	normalizeLearnable,
	normalizeLevel,
	normalizeLevelThing,
} from "../ids";
import { jsonResult } from "../results";

export function registerLevelTools(server: McpServer): void {
	server.registerTool(
		"levels_list",
		{
			title: "List Course Levels",
			description: `List a course's levels with their levelIds, poolIds and level numbers. Start here to find the levelId other tools need. Levels with no items are omitted. ${ID_GLOSSARY}`,
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				slug: z.string().optional().describe("Optional course slug."),
				includeEmpty: z
					.boolean()
					.optional()
					.describe("Include empty levels parsed from the editor."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ courseId, slug, includeEmpty }) => {
			const levels = await withMemrise(async (client) => {
				if (includeEmpty) {
					return await client.getCourseLevelsIncludingEmpty(courseId, slug);
				}
				return await client.getCourseLevels(courseId, slug);
			});
			return jsonResult(levels.map(normalizeLevel));
		},
	);

	server.registerTool(
		"levels_create",
		{
			title: "Create Level",
			description:
				"Add a new level to a course. Resolve the course and pool IDs with courses_list or levels_list first.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				poolId: z
					.union([z.string(), z.number()])
					.optional()
					.describe(
						"Pool ID. If omitted, uses the pool ID from the first level.",
					),
				kind: z
					.string()
					.optional()
					.describe("Level kind. Defaults to 'things'."),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ courseId, poolId, kind }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.addLevelToCourse(courseId, poolId, kind),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"levels_update_title",
		{
			title: "Update Level Title",
			description: "Update the title of a level.",
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
				title: z.string().min(1).describe("New level title."),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: true,
			},
		},
		async ({ levelId, title }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.setLevelTitle(levelId, title),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"levels_delete",
		{
			title: "Delete Level",
			description: "Delete a level.",
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
			},
			annotations: {
				destructiveHint: true,
			},
		},
		async ({ levelId }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.deleteLevel(levelId),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"levels_list_things",
		{
			title: "List Things in Level",
			description: `List every thing (item) currently attached to a level, with the thingId that things_delete_from_level requires alongside the item text. Use this to enumerate a level — pools_search needs a search term and cannot return everything. ${ID_GLOSSARY}`,
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ courseId, levelId }) => {
			const things = await withMemrise((client) =>
				client.getLevelThings(courseId, levelId),
			);
			return jsonResult(things.map(normalizeLevelThing));
		},
	);

	server.registerTool(
		"levels_get_items_by_number",
		{
			title: "Get Level Items by Number",
			description: `Get the items in a level, chosen by the level number shown in the Memrise editor (1-based). Each item comes back with both its learnableId and its thingId. Asking for a number that has no items is an error listing the numbers that do. ${ID_GLOSSARY}`,
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				levelNumber: z
					.number()
					.int()
					.positive()
					.optional()
					.describe(
						"Level number as shown in the Memrise editor (1-based). Defaults to 1.",
					),
				limit: z
					.number()
					.int()
					.positive()
					.optional()
					.describe("Limit number of items to fetch."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ courseId, levelNumber, limit }) => {
			const items = await withMemrise((client) =>
				client.getLevelItems(courseId, levelNumber ?? 1, limit),
			);
			return jsonResult(items.map(normalizeLearnable));
		},
	);
}
