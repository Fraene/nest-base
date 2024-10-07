export interface IndexResponse<T = any> {
	data: T[];
	filtered: number;
	total: number;
}