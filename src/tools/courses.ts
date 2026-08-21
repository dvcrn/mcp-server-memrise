import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { normalizeLearnable } from "../ids";
import { jsonResult } from "../results";

export function registerCourseTools(server: McpServer): void {
	server.registerTool(
		"courses_list",
		{
			title: "List Memrise Courses",
			description:
				"List the courses on your Memrise dashboard, with their course IDs. Start here when you only know a course by name.",
			inputSchema: {
				limit: z
					.number()
					.int()
					.positive()
					.optional()
					.describe("Number of courses to return. Defaults to 9."),
				offset: z
					.number()
					.int()
					.nonnegative()
					.optional()
					.describe("Pagination offset. Defaults to 0."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ limit, offset }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getMyCourses(limit ?? 9, offset ?? 0),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"courses_get",
		{
			title: "Get Memrise Course by ID",
			description: "Get a course from your dashboard by its ID.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ courseId }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getCourseById(courseId),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"courses_get_by_slug",
		{
			title: "Get Memrise Course by Slug",
			description: "Get a course from your dashboard by its slug.",
			inputSchema: {
				slug: z.string().min(1).describe("Course slug."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ slug }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getCourseBySlug(slug),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"courses_get_columns",
		{
			title: "Get Course Columns",
			description:
				"Show the columns a course uses, with their names and numeric keys. Add and search tools accept either form, so this is for inspection rather than a required first step.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ courseId }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getCourseColumns(courseId),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"courses_get_items",
		{
			title: "Get Course Items",
			description:
				"Get every item in a course, across all levels. Each item carries both its learnableId and its thingId. Prefer levels_list_things when you only need one level.",
			inputSchema: {
				courseId: z.union([z.string(), z.number()]).describe("Course ID."),
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
		async ({ courseId, limit }) => {
			const items = await withMemrise((client) =>
				client.getCourseItems(courseId, limit),
			);
			return jsonResult(items.map(normalizeLearnable));
		},
	);
}
