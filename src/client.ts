import { MemriseClient } from "memrise";

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function optionalEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value ? value : undefined;
}

export function createAuthenticatedMemriseClient(): MemriseClient {
	const client = new MemriseClient(
		requiredEnv("MEMRISE_USERNAME"),
		requiredEnv("MEMRISE_PASSWORD"),
		optionalEnv("MEMRISE_CLIENT_ID"),
	);
	return client;
}

export async function withMemrise<T>(
	callback: (client: MemriseClient) => Promise<T>,
): Promise<T> {
	const client = createAuthenticatedMemriseClient();
	return callback(client);
}
