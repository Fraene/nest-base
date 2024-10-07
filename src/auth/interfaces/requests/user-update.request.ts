export interface UserUpdateRequest {
	name?: string;
	email?: string;
	changePassword?: boolean;
	newPassword?: string;
	group?: number;
}