import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from "../models/user.entity";
import { JwtSettings } from "../../config/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
	constructor(){
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: JwtSettings.secret
		})
	}

	async validate(payload: any) {
		const id = payload.sub;
		const user: User & any = await User.findOneBy({ id });
		user.payload = payload;
		return user;
	}
}