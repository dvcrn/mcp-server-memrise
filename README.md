# mcp-server-memrise

`mcp-server-memrise` is an MCP server to manage Memrise courses, levels, and words.

It is built on top of the [`memcli`](https://github.com/dvcrn/memcli) project and uses the published [`memrise`](https://www.npmjs.com/package/memrise) package to interact with Memrise for teaching and course management workflows.

Deploy this server directly to [MCP Nest](https://mcpnest.dev)

<a href="https://mcpnest.dev/deploy?server=mcp-server-memrise&package-manager=npx&env[MEMRISE_USERNAME]=&env[MEMRISE_PASSWORD]=">
    <img src="https://mcpnest.dev/images/deploy-on-mcpnest.png" alt="Deploy on MCP Nest" height="32" />
  </a>

## Install

Run it directly with:

```bash
npx -y mcp-server-memrise
```

## Usage with Claude

Add it to your MCP configuration:

```json
{
  "mcpServers": {
    "memrise": {
      "command": "npx",
      "args": ["-y", "mcp-server-memrise"],
      "env": {
        "MEMRISE_USERNAME": "your-memrise-username",
        "MEMRISE_PASSWORD": "your-memrise-password"
      }
    }
  }
}
```

## Configuration

The server reads Memrise credentials from environment variables:

Required:

- `MEMRISE_USERNAME`
- `MEMRISE_PASSWORD`

## What it can do

Built on top of [`dvcrn/memcli`](https://github.com/dvcrn/memcli), this MCP server exposes the Memrise API for common teaching and course creation workflows, including:

- listing and fetching teaching courses
- managing course levels (listing, creating, renaming, deleting)
- inspecting course schema and column mappings
- managing course items/learnables (adding/removing words on levels or courses, including bulk add)
- searching backend pools (to avoid duplicate items)
