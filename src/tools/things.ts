import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { jsonResult } from "../results";

export function registerThingTools(server: McpServer): void {
	server.registerTool(
		"things_add_to_level",
		{
			title: "Add Thing to Level",
			description:
				"Add a new thing (item) to a specific level by its ID. CRITICAL: Memrise expects numeric keys for columns (e.g. '1', '2'), not strings like 'term'. You MUST call courses_get_columns first to map fields to numeric IDs.",
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
		async ({ levelId, columns }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.addThingToLevel(String(levelId), columns),
				)) as unknown as Record<string, unknown>,
			),
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
		async ({ courseId, columns, levelIndex }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.addThingToCourse(courseId, columns, levelIndex ?? 0),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"learnables_get",
		{
			title: "Get Learnable",
			description:
				"Get a specific learnable item by its ID. Learnables are the actual word/definition rows inside a Pool.",
			inputSchema: {
				learnableId: z
					.union([z.string(), z.number()])
					.describe("Learnable ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ learnableId }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getLearnable(learnableId),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"things_delete_from_level",
		{
			title: "Delete Thing from Level",
			description:
				"Remove a thing (item) from a specific level. Requires the level ID and thing ID. Use levels_list / levels_get_items_by_index to resolve exact IDs before calling this.",
			inputSchema: {
				levelId: z.union([z.string(), z.number()]).describe("Level ID."),
				thingId: z.union([z.string(), z.number()]).describe("Thing ID."),
			},
			annotations: {
				destructiveHint: true,
			},
		},
		async ({ levelId, thingId }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.deleteThingFromLevel(levelId, thingId),
				)) as unknown as Record<string, unknown>,
			),
	);
}
