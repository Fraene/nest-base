import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { JwtSettings } from "../config/config";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./services/jwt.strategy";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./services/jwt.guard";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./models/user.entity";
import { Group } from "./models/group.entity";
import { UserPermission } from "./models/user-permission.entity";
import { GroupPermission } from "./models/group-permission.entity";
import { AuthController } from "./controllers/auth.controller";
import { GroupController } from "./controllers/group.controller";
import { PermissionGuard } from "./services/permission.guard";
import { UserController } from "./controllers/user.controller";

@Module({
	imports: [
		CommonModule,
		JwtModule.register(JwtSettings),
		TypeOrmModule.forFeature([
			User,
			Group,
			UserPermission,
			GroupPermission
		])
	],
	controllers: [
		AuthController,
		GroupController,
		UserController
	],
	providers: [
		JwtStrategy,
		{ provide: APP_GUARD, useClass: JwtAuthGuard },
		{ provide: APP_GUARD, useClass: PermissionGuard }
	]
})
export class AuthModule {}