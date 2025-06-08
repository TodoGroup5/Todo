export interface ApiResponse<S = unknown, F = undefined> {
	data?: JSONResult<S, F>;
	message?: string;
	error?: string;
	status: number;
}

// Either (success + data)/(failure + error)
export type JSONResult<S = unknown, F = undefined> = (
  { status: 'success'; data?: S; } |
  { status: 'failed'; error: string; data?: F }
);

export interface CrudOptions {
	headers?: { [key: string]: string };
	params?: { [key: string]: string };
}

export interface TokenProvider {
	getToken(): string | null;
	setToken(token: string): void;
	removeToken(): void;
}
