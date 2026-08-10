import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withMemrise } from "../client";
import { jsonResult } from "../results";

export function registerCourseTools(server: McpServer): void {
	server.registerTool(
		"memrise_courses_list",
		{
			title: "List Memrise Courses",
			description:
				"List courses on your Memrise dashboard. Use this first to discover exact Course IDs. Do not guess IDs.",
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
		"memrise_courses_get",
		{
			title: "Get Memrise Course by ID",
			description: "Get a course from your dashboard by its ID.",
			inputSchema: {
				id: z.union([z.string(), z.number()]).describe("Course ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ id }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getCourseById(id),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"memrise_courses_get_by_slug",
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
		"memrise_courses_get_columns",
		{
			title: "Get Course Columns",
			description:
				"Get the column configuration for a course. CRITICAL: Memrise uses numeric keys for columns (e.g., '1', '2'). You MUST use this tool to discover the numeric column mapping before adding items or searching pools.",
			inputSchema: {
				id: z.union([z.string(), z.number()]).describe("Course ID."),
			},
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({ id }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getCourseColumns(id),
				)) as unknown as Record<string, unknown>,
			),
	);

	server.registerTool(
		"memrise_courses_get_items",
		{
			title: "Get Course Items",
			description: "Get all learnable items for a course.",
			inputSchema: {
				id: z.union([z.string(), z.number()]).describe("Course ID."),
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
		async ({ id, limit }) =>
			jsonResult(
				(await withMemrise((client) =>
					client.getCourseItems(id, limit),
				)) as unknown as Record<string, unknown>,
			),
	);
}
