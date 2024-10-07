import { config } from 'dotenv';
import { JwtModuleOptions } from '@nestjs/jwt';

config();

export const JwtSettings: JwtModuleOptions = {
	secret: process.env.JWT_SECRET ?? '',
	signOptions: {
		expiresIn: '1h',
	},
};
