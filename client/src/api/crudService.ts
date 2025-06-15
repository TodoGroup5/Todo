import type { ApiResponse, CrudOptions } from "./types";
import { baseUrl } from "../utility/deployment";
export class CrudService {
	private static readonly baseUrl = baseUrl();

	private static getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...customHeaders,
		};

		return headers;
	}

	//----- Request wrapper utils -----//
	// S is the expected result.data.data type if successful
	private static async makeRequest<S>(url: string, method: string, body?: any, options?: CrudOptions): Promise<ApiResponse<S>> {
		try {
			const headers = this.getHeaders(options?.headers);
			const queryParams = options?.params
				? "?" + new URLSearchParams(options.params).toString()
				: "";

			const response = await fetch(
				`${this.baseUrl}${url}${queryParams}`,
				{
					method,
					headers,
					body: body ? JSON.stringify(body) : undefined,
				}
			);

			const responseData = await response.json().catch(() => ({}));

			return {
				data: responseData,
				status: response.status,
				message: responseData.message,
				error: response.ok
					? undefined
					: responseData.error || `HTTP ${response.status}`,
			};
		} catch (error) {
			return {
				status: 0,
				error: error instanceof Error ? error.message : "Network error",
			};
		}
	}


	//----- CRUD functions -----//
	// R is the expected result.data.data type if successful
	static create<T, R>(endpoint: string, data: T, options?: CrudOptions): Promise<ApiResponse<R>> {
		return this.makeRequest<R>(endpoint, "POST", data, options);
	}
	static read<R>(endpoint: string, options?: CrudOptions): Promise<ApiResponse<R>> {
		return this.makeRequest<R>(endpoint, "GET", undefined, options);
	}
	static update<T, R>(endpoint: string, id: string | number, data: Partial<T>, options?: CrudOptions): Promise<ApiResponse<R>> {
		if (endpoint.endsWith("/")) { endpoint = endpoint.slice(0, -1); }
		return this.makeRequest<R>(`${endpoint}/${id}`, "PUT", data, options);
	}
	static delete<R>(endpoint: string, id: string | number, options?: CrudOptions): Promise<ApiResponse<R>> {
		if (endpoint.endsWith("/")) { endpoint = endpoint.slice(0, -1); }
		return this.makeRequest<R>(`${endpoint}/${id}`, "DELETE", undefined, options);
	}
	static customRequest<R>(endpoint: string, method: string, body?: any, options?: CrudOptions): Promise<ApiResponse<R>> {
		return this.makeRequest<R>(endpoint, method, body, options);
	}
}
