import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import {
	normalizeLearnable,
	normalizeLevel,
	normalizeLevelThing,
	LEVEL_ID_HINT,
} from "../ids";
import { jsonResult } from "../results";

export function registerLevelTools(server: McpServer): void {
	server.registerTool(
		"levels_list",
		{
			title: "List Course Levels",
			description: `List a course's levels with their levelIds, poolIds and level numbers. Start here to find the levelId other tools need. Levels with no items are omitted.`,
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				includeEmpty: z
					.boolean()
					.optional()
					.describe("Include empty levels parsed from the editor."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ courseId, includeEmpty }) => {
			const levels = await withMemrise(async (client) => {
				if (includeEmpty) {
					return await client.getCourseLevelsIncludingEmpty(courseId);
				}
				return await client.getCourseLevels(courseId);
			});
			return jsonResult(levels.map(normalizeLevel));
		},
	);

	server.registerTool(
		"levels_create",
		{
			title: "Create Level",
			description:
				"Add a new level to a course and return its levelId, which the things_* tools need. Resolve the course and pool IDs with courses_list or levels_list first. A new level starts empty, so it will not appear in levels_list until it has items.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				poolId: z
					.union([z.string(), z.number()])
					.optional()
					.describe(
						"Pool ID. If omitted, uses the pool ID from the first level.",
					),
			},
			annotations: {
				readOnlyHint: false,
				idempotentHint: false,
			},
		},
		async ({ courseId, poolId }) => {
			const res = await withMemrise((client) =>
				client.addLevelToCourse(courseId, poolId),
			);
			if (!res.levelId) {
				throw new Error(
					`Level creation reported ${JSON.stringify(res.success)} but no levelId came back. Use levels_list with includeEmpty to find it.`,
				);
			}
			return jsonResult({ success: res.success, levelId: res.levelId });
		},
	);

	server.registerTool(
		"levels_update_title",
		{
			title: "Update Level Title",
			description: "Update the title of a level.",
			inputSchema: {
				levelId: z
					.union([z.string(), z.number()])
					.describe(`Level ID. ${LEVEL_ID_HINT}`),
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
				levelId: z
					.union([z.string(), z.number()])
					.describe(`Level ID. ${LEVEL_ID_HINT}`),
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
			description:
				"List everything in a level. Each item carries both its thingId and its learnableId; use thingId to delete. This is how you enumerate a level, since pools_search always needs a search term.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				levelId: z
					.union([z.string(), z.number()])
					.describe(`Level ID. ${LEVEL_ID_HINT}`),
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

}
