import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { jsonResult } from "../results";

export function registerLevelTools(server: McpServer): void {
	server.registerTool(
		"memrise_levels_list",
		{
			title: "List Course Levels",
			description:
				"List all levels in a course. Use this to discover exact Level IDs and Pool IDs. Memrise Levels are backed by a Pool. Do not guess IDs.",
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
			return jsonResult(
				(await withMemrise(async (client) => {
					if (includeEmpty) {
						return await client.getCourseLevelsIncludingEmpty(courseId, slug);
					}
					return await client.getCourseLevels(courseId, slug);
				})) as unknown as Array<unknown>,
			);
		},
	);

	server.registerTool(
		"memrise_levels_create",
		{
			title: "Create Level",
			description:
				"Add a new level to a course. Do not guess Course or Pool IDs. Use memrise_courses_list or memrise_levels_list to resolve exact IDs before calling this.",
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
		},
		async ({ courseId, poolId, kind }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.addLevelToCourse(courseId, poolId, kind),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"memrise_levels_update_title",
		{
			title: "Update Level Title",
			description: "Update the title of a level.",
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
				title: z.string().min(1).describe("New level title."),
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
		"memrise_levels_delete",
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
		"memrise_levels_get_items",
		{
			title: "Get Level Items",
			description: "Get items for a specific level by its index.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
				levelIndex: z
					.number()
					.int()
					.nonnegative()
					.optional()
					.describe("Level index (0-based). Defaults to 0."),
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
		async ({ courseId, levelIndex, limit }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getLevelItems(courseId, levelIndex ?? 0, limit),
				)) as unknown as Array<unknown>,
			),
	);
}
