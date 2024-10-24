import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import typeormTest from "../src/config/typeorm-test";
import { DataSource } from "typeorm";
import { AuthModule } from "../src/auth/auth.module";
import { v4 } from 'uuid';
import { INestApplication } from "@nestjs/common";

export const getTestModule = async (): Promise<TestingModule> => {
	const module = await Test.createTestingModule({
		imports: [
			ConfigModule.forRoot({ isGlobal: true, load: [ typeormTest ] }),
			TypeOrmModule.forRootAsync({
				inject: [ ConfigService ],
				useFactory: async (configService: ConfigService) => {
					const config = configService.get('typeorm-test');
					config.database += `_${v4()}`;

					const preConnection = new DataSource({ ...config, database: 'mysql' });
					await preConnection.initialize();
					await preConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
					await preConnection.destroy();

					return config;
				},
			}),
			AuthModule
		]
	}).compile();

	const connection = module.get(DataSource);
	await connection.runMigrations();

	return module;
}

export const cleanUp = async (app: INestApplication): Promise<void> => {
	const connection = app.get(DataSource);
	await connection.query(`DROP DATABASE \`${connection.options.database}\`;`)
	await connection.destroy();
	await app.close();
}