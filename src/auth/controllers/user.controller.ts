import { Body, Controller, Delete, Get, HttpCode, HttpException, NotFoundException, Param, Post, Put, Query } from "@nestjs/common";
import { DataSource, Not } from "typeorm";
import { Permission } from "../services/permission.guard";
import { IndexRequest } from "../../common/interfaces/requests/index.request";
import { IndexResponse } from "../../common/interfaces/responses/index-response.interface";
import { UserFilters } from "../interfaces/user.filters";
import { User } from "../models/user.entity";
import { UserCreateRequest } from "../interfaces/requests/user-create.request";
import * as argon2 from "argon2";
import { Group } from "../models/group.entity";
import { UserUpdateRequest } from "../interfaces/requests/user-update.request";

@Controller('user')
export class UserController {
	constructor(
		private dataSource: DataSource,
	){}

	@Get() @Permission('USER_LIST')
	public async index(@Query() body: IndexRequest<UserFilters>): Promise<IndexResponse<User>> {
		const data = User.createQueryBuilder('user');
		const total = await data.getCount();

		// Filters
		for(const key in body.filters ?? {}){
			switch(key){
				case 'name':
					data.andWhere('user.username LIKE :name', { name: body.filters[key] });
					break;
				case 'email':
					data.andWhere('user.email LIKE :email', { email: body.filters[key] });
					break;
				case 'groups':
					data.andWhere('user.groupId IN (:...ids)', { ids: body.filters[key] })
					break;
			}
		}
		const filtered = await data.getCount();

		// Sort
		body.sortBy ??= 'user.id';
		body.sortDir ??= 'asc';
		data.orderBy(body.sortBy, <'ASC'|'DESC'>body.sortDir.toUpperCase());

		// Pagination
		body.page ??= 1;
		body.perPage ??= 15;
		data.skip((body.page - 1) * body.perPage).take(body.perPage);

		return { data: await data.getMany(), filtered, total }
	}

	@Get(':id') @Permission('USER_GET')
	public async get(@Param('id') id: number): Promise<User> {
		const entry = await User.findOne({ where: { id }, relations: { permissions: true } });

		if (!entry)
			throw new NotFoundException({ message: 'User not found' });

		return entry;
	}

	@Post() @Permission('USER_CREATE')
	public async create(@Body() body: UserCreateRequest): Promise<User> {
		// TODO Validation
		const emailTaken = await User.findOne({ where: { email: body.email } });
		if(emailTaken)
			throw new HttpException({ message: 'User with this email address already exists' }, 400);

		const runner = this.dataSource.createQueryRunner();
		await runner.connect();
		await runner.startTransaction();
		try {
			const entry = User.create();
			entry.username = body.name;
			entry.email = body.email;
			entry.password = (await argon2.hash(body.password)).toString();

			const group = await Group.findOne({ where: { id: body.group } });

			if(!group)
				throw new NotFoundException({ message: 'Invalid group' });

			entry.group = group;
			await runner.manager.save(entry);
			await runner.commitTransaction();
			return entry;
		} catch(error) {
			await runner.rollbackTransaction();
			throw new HttpException(error, 400);
		}
	}

	@Put(':id') @Permission('USER_UPDATE')
	public async update(@Param('id') id: number, @Body() body: UserUpdateRequest): Promise<User> {
		const entry = await User.findOne({ where: { id }, relations: { permissions: true } });

		if (!entry)
			throw new NotFoundException({ message: 'User not found' });

		// TODO Validation
		if(body.email !== undefined){
			const emailTaken = await User.findOne({ where: { email: body.email, id: Not(id) } });
			if(emailTaken)
				throw new HttpException({ message: 'User with this email address already exists' }, 400);
		}


		const runner = this.dataSource.createQueryRunner();
		await runner.connect();
		await runner.startTransaction();
		try {
			entry.username = body.name ?? entry.username;
			entry.email = body.email ?? entry.email;
			if(body.changePassword){
				entry.password = (await argon2.hash(body.newPassword)).toString();
			}
			if(body.group !== undefined){
				const group = await Group.findOne({ where: { id: body.group } });
				if(!group)
					throw new NotFoundException({ message: 'Invalid group' });

				entry.group = group;
			}

			await runner.manager.save(entry);
			await runner.commitTransaction();
			return entry;
		} catch(error) {
			await runner.rollbackTransaction();
			throw new HttpException(error, 400);
		}
	}

	@Delete(':id') @HttpCode(204) @Permission('USER_DELETE')
	public async delete(@Param('id') id: number): Promise<void> {
		const entry = await User.findOne({ where: { id } });

		if(!entry)
			throw new NotFoundException({ message: 'User not found' });

		await entry.softRemove();
	}
}