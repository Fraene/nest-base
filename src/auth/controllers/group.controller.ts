import { Body, Controller, Delete, Get, HttpCode, HttpException, NotFoundException, Param, Post, Put, Query } from "@nestjs/common";
import { Permission } from "../services/permission.guard";
import { IndexResponse } from "../../common/interfaces/responses/index-response.interface";
import { Group } from "../models/group.entity";
import { IndexRequest } from "../../common/interfaces/requests/index.request";
import { GroupFilters } from "../interfaces/group.filters";
import { GroupCreateRequest } from "../interfaces/requests/group-create.request";
import { GroupPermission } from "../models/group-permission.entity";
import { GroupUpdateRequest } from "../interfaces/requests/group-update.request";
import { DataSource } from "typeorm";

@Controller('group')
export class GroupController {
	constructor(
		private dataSource: DataSource,
	){}

	@Get() @Permission('GROUP_LIST')
	public async index(@Query() body: IndexRequest<GroupFilters>): Promise<IndexResponse<Group>> {
		const data = Group.createQueryBuilder('group');
		const total = await data.getCount();

		// Filters
		for(const key in body.filters ?? {}){
			switch(key){
				case 'name':
					data.andWhere('group.name LIKE :name', { name: body.filters[key] });
					break;
			}
		}
		const filtered = await data.getCount();

		// Sort
		body.sortBy ??= 'group.id';
		body.sortDir ??= 'asc';
		data.orderBy(body.sortBy, <'ASC'|'DESC'>body.sortDir.toUpperCase());

		// Pagination
		body.page ??= 1;
		body.perPage ??= 15;
		data.skip((body.page - 1) * body.perPage).take(body.perPage);

		return { data: await data.getMany(), filtered, total }
	}

	@Get(':id') @Permission('GROUP_GET')
	public async get(@Param('id') id: number): Promise<Group> {
		const entry = await Group.findOne({ where: { id }, relations: { permissions: true } });

		if (!entry)
        	throw new NotFoundException({ message: 'Group not found' });

		return entry;
	}

	@Post() @Permission('GROUP_CREATE')
	public async create(@Body() body: GroupCreateRequest): Promise<Group> {
		// TODO Validation
		const runner = this.dataSource.createQueryRunner();
		await runner.connect();
		await runner.startTransaction();
		try {
			const entry = Group.create();
			entry.name = body.name;
			await runner.manager.save(entry);

			const permissions = body.permissions.map(p => {
				const permission = GroupPermission.create();
				permission.group = entry;
				permission.permission = p;
				permission.allow = true;
				return permission;
			});
			await runner.manager.save(permissions);

			await runner.commitTransaction();
			await entry.reload();
			return entry;
		} catch(error) {
			await runner.rollbackTransaction();
			throw new HttpException(error, 400);
		}
	}

	@Put(':id') @Permission('GROUP_UPDATE')
	public async update(@Param('id') id: number, @Body() body: GroupUpdateRequest): Promise<Group> {
		// TODO Validation
		const entry = await Group.findOne({ where: { id }, relations: { permissions: true } });

		if (!entry)
			throw new NotFoundException({ message: 'Group not found' });

		const runner = this.dataSource.createQueryRunner();
		await runner.connect();
		await runner.startTransaction();
		try {
			entry.name = body.name;
			await runner.manager.save(entry);

			if(body.permissions !== undefined) {
				for (const permission of await entry.permissions) {
					if (body.permissions.includes(permission.permission)) {
						if (!permission.allow) {
							permission.allow = true;
							await runner.manager.save(permission);
						}
					} else {
						await runner.manager.remove(permission);
					}
				}
				await entry.reload();
				for (const permission of body.permissions) {
					if (!(await entry.permissions).some(p => p.permission === permission)) {
						const newPermission = GroupPermission.create();
						newPermission.group = entry;
						newPermission.permission = permission;
						newPermission.allow = true;
						await runner.manager.save(newPermission);
					}
				}
				await entry.reload();
			}

			await runner.commitTransaction();

			return entry;
		} catch(error) {
			await runner.rollbackTransaction();
			throw new HttpException(error, 400);
		}
	}

	@Delete(':id') @HttpCode(204) @Permission('GROUP_DELETE')
	public async delete(@Param('id') id: number): Promise<void> {
		const entry = await Group.findOne({ where: { id } });

		if(!entry)
			throw new NotFoundException({ message: 'Group not found' });

		if(entry.protected)
			throw new HttpException({ message: 'Cannot remove this group' }, 400);

		await entry.softRemove();
	}
}