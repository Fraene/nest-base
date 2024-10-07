export interface IndexRequest<T = any> {
	page?: number;
	perPage?: number;
	filters?: T;
	sortBy?: string;
	sortDir?: 'asc' | 'desc';
}