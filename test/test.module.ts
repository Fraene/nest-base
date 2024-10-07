import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import typeormTest from "../src/config/typeorm-test";
import { DataSource } from "typeorm";
import { AuthModule } from "../src/auth/auth.module";

export const getTestModule = async (): Promise<TestingModule> => {
	const module = await Test.createTestingModule({
		imports: [
			ConfigModule.forRoot({ isGlobal: true, load: [ typeormTest ] }),
			TypeOrmModule.forRootAsync({
				inject: [ ConfigService ],
				useFactory: async (configService: ConfigService) => configService.get('typeorm-test')
			}),
			AuthModule
		]
	}).compile();

	const connection = module.get(DataSource);
	await connection.runMigrations();

	return module;
}