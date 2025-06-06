export interface ApiResponse<T = any> {
	data?: T;
	message?: string;
	error?: string;
	status: number;
}

export interface CrudOptions {
	headers?: Record<string, string>;
	params?: Record<string, any>;
}

export interface TokenProvider {
	getToken(): string | null;
	setToken(token: string): void;
	removeToken(): void;
}
