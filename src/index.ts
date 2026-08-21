import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerCourseTools } from "./tools/courses";
import { registerLevelTools } from "./tools/levels";
import { registerPoolTools } from "./tools/pools";
import { registerThingTools } from "./tools/things";

function createServer(): McpServer {
	const server = new McpServer({
		name: "memrise",
		version: "0.6.0",
	});

	registerCourseTools(server);
	registerLevelTools(server);
	registerPoolTools(server);
	registerThingTools(server);

	return server;
}

async function main(): Promise<void> {
	const server = createServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error("Failed to start Memrise MCP server:", error);
	process.exit(1);
});
