import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { jsonResult } from "../results";

export function registerCourseTools(server: McpServer): void {
	server.registerTool(
		"courses_list",
		{
			title: "List Memrise Courses",
			description:
				"List every course on your Memrise dashboard with its courseId. Start here when you only know a course by name.",
			inputSchema: {
				limit: z
					.number()
					.int()
					.positive()
					.optional()
					.describe("Cap the number returned. Defaults to all of them."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ limit }) => {
			const courses = await withMemrise((client) =>
				client.getAllMyCourses(limit),
			);
			return jsonResult(
				courses.map((course) => ({
					courseId: course.id,
					name: course.name,
					slug: course.slug,
					itemCount: course.progress?.size,
				})),
			);
		},
	);

	server.registerTool(
		"courses_get",
		{
			title: "Get Memrise Course by ID",
			description:
				"Get one course by its courseId, including its name and slug. Course URLs are /course/{courseId}/{slug}/, so the ID is in the link.",
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
				"Get every item in a course in one call, each tagged with the levelIds it belongs to, so a result can be passed straight to things_delete_from_level. Prefer levels_list_things when you only care about one level.",
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
			return jsonResult(items);
		},
	);
}
