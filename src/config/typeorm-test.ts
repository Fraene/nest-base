import { config } from 'dotenv';
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { registerAs } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";

config();

const OrmSettings: TypeOrmModuleOptions = {
	type: <any>process.env.DATABASE_TYPE ?? 'mysql',
	host: process.env.DATABASE_HOST ?? 'localhost',
	port: Number(process.env.DATABASE_PORT ?? '3306'),
	database: process.env.DATABASE_BASE + '-test',
	username: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASS,
	entities: [ 'dist/**/*.entity{.ts,.js}' ],
	migrations: [ 'dist/migrations/*{.ts,.js}' ],
	autoLoadEntities: true,
	synchronize: false
};

export default registerAs('typeorm-test', () => OrmSettings);
export const connectionSource = new DataSource(OrmSettings as DataSourceOptions);