import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const PERMISSION_KEY = "permission";

export const Permission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class PermissionGuard implements CanActivate {
	constructor(
		private reflector: Reflector
	){}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
		if (!requiredPermission) {
			return true;
		}

		// Assuming there's a request property with user permissions in the request.
		const request = context.switchToHttp().getRequest();
		const user = request.user;

		return await user.HasPermission(requiredPermission);
	}
}