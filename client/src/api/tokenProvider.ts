import type { TokenProvider } from "./types";

export class JWTTokenProvider implements TokenProvider {
	private readonly storageKey = "auth_token";

	getToken(): string | null {
		return this.token;
	}

	setToken(token: string): void {
		this.token = token;
	}

	removeToken(): void {
		this.token = null;
	}

	private token: string | null = null;
}
