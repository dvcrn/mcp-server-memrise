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

let sharedClient: MemriseClient | null = null;

export function getAuthenticatedMemriseClient(): MemriseClient {
	if (!sharedClient) {
		sharedClient = new MemriseClient(
			requiredEnv("MEMRISE_USERNAME"),
			requiredEnv("MEMRISE_PASSWORD"),
			optionalEnv("MEMRISE_CLIENT_ID"),
		);
	}
	return sharedClient;
}

export async function withMemrise<T>(
	callback: (client: MemriseClient) => Promise<T>,
): Promise<T> {
	const client = getAuthenticatedMemriseClient();
	return callback(client);
}
