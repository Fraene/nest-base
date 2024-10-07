import { Body, Controller, HttpCode, HttpException, Post, Req, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { Public } from "../services/jwt.guard";
import { LoginResponse } from "../interfaces/responses/login.response";
import { User } from "../models/user.entity";
import { GenericResponse } from "../../common/interfaces/responses/generic.response";
import { LoginRequest } from "../interfaces/requests/login.request";
import { RegisterRequest } from "../interfaces/requests/register.request";
import { Group } from "../models/group.entity";

@Controller('auth')
export class AuthController {
	constructor(
		private jwt: JwtService
	){}

	@Public() @Post('/login') @HttpCode(200)
	async logIn(@Body() request: LoginRequest): Promise<LoginResponse> {
		if(!request.login)
			throw new UnauthorizedException({ message: 'User does not exist' });

		const user = await User.findOne({
			select: {
				id: true,
				password: true
			},
			where: {
				email: request.login
			}
		});

		if(!user)
			throw new UnauthorizedException({ message: 'User does not exist' });

		const passCorrect = await argon2.verify(user.password, request.password);

		if(!passCorrect)
			throw new UnauthorizedException({ message: 'Password incorrect' });

		const userData = await User.findOneBy({ email: request.login });

		const token = await this.jwt.signAsync({
			sub: Number(userData.id),
			user: userData
		}, { expiresIn: '2h' });

		return { token };
	}

	@Public() @Post('/register')
	async register(@Body() request: RegisterRequest): Promise<GenericResponse> {
		if(!request.username || !request.email || !request.password)
			throw new HttpException({ message: 'Missing field' }, 400);

		const emailTaken = await User.findOne({ where: { email: request.email } });
		if(emailTaken)
			throw new HttpException({ message: 'User with this email address already exists' }, 400);

		const user = await User.create({
			username: request.username,
			email: request.email,
			password: (await argon2.hash(request.password)).toString(),
			group: <Group>{ id: 2 }
		}).save();

		if(!user)
			throw new HttpException({ message: 'Failed to create user' }, 500);

		return { message: 'User created, you can now log in' };
	}

	@Post('/refresh') @HttpCode(200)
	async refreshToken(@Req() request: Request): Promise<LoginResponse> {
		const user = <User>request.user;

		const userData = await User.findOneBy({ id: user.id });

		if(!userData)
			throw new UnauthorizedException({ message: 'Failed to retrieve user' });

		const token = await this.jwt.signAsync({
			sub: user.id,
			user: userData
		});

		return { token };
	}
}
