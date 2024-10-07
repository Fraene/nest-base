import { INestApplication } from "@nestjs/common";
import { getTestModule } from "../test.module";
import { DataSource } from "typeorm";
import * as request from 'supertest';
import { UserPermission } from "../../src/auth/models/user-permission.entity";
import { User } from "../../src/auth/models/user.entity";
import { Group } from "../../src/auth/models/group.entity";

describe('GroupController', () => {
	let app: INestApplication;

	let adminToken: string;

	beforeAll(async () => {
		const module = await getTestModule();

		app = module.createNestApplication();
		await app.init();

		const adminLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
			login: 'admin@test.com',
			password: '123456'
		});

		adminToken = adminLoginResponse.body.token;
	});

	afterAll(async () => {
		const connection = app.get(DataSource);
		await connection.dropDatabase();
		await connection.destroy();
		await app.close();
	});

	describe('GET /group', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).get('/group');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `GROUP_LIST`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'GROUP_LIST';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).get('/group').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 200 and list of groups', async () => {
			const response = await request(app.getHttpServer()).get('/group').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(3);
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(3);
		});

		it('Should limit page size', async () => {
			const response = await request(app.getHttpServer()).get('/group?page=1&perPage=2').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(2);
			expect(response.body.data[0].id).toBe("1");
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(3);
		});

		it('Should paginate', async () => {
			const response = await request(app.getHttpServer()).get('/group?page=2&perPage=2').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(1);
			expect(response.body.data[0].id).toBe("3");
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(3);
		});

		it('Should filter by name', async () => {
			const response = await request(app.getHttpServer()).get('/group?filters[name]=guest').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(1);
			expect(response.body.data[0].name).toBe('Guest');
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(1);
		});

		it('Should be sortable', async () => {
			const response = await request(app.getHttpServer()).get('/group?sortBy=id&sortDir=desc').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(3);
			let prev: string;
			expect(response.body.data.every(u => (!prev || u.id < prev) && (prev = u.id))).toBe(true);
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(3);
		})
	});

	describe('GET /group/:id', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).get('/group/1');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `GROUP_GET`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'GROUP_GET';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).get('/group/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 200 and group data', async () => {
			const response = await request(app.getHttpServer()).get('/group/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(response.body.id).toBe('1');
			expect(response.body.name).toBe('Admin');
		});

		it('Should return HTTP 404 if group not found', async () => {
			const response = await request(app.getHttpServer()).get('/group/404').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(404);
		});
	});

	describe('POST /group', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).post('/group');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `GROUP_CREATE`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'GROUP_CREATE';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).post('/group').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 201 and create a group', async () => {
			const response = await request(app.getHttpServer()).post('/group').send({
				name: 'TestGroup',
				permissions: [ 'USER_GET', 'USER_LIST', 'USER_CREATE', 'GROUP_GET', 'GROUP_LIST' ]
			}).set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(201);

			const group = await Group.findOne({ order: { id: 'DESC' }, where: { deletedAt: null } });
			const permissions = await group.permissions;

			expect(group).toBeTruthy();
			expect(group.name).toBe('TestGroup');
			expect(permissions.length).toBe(5);
			expect(permissions.some(p => p.permission === 'USER_CREATE')).toBe(true);
		});
	});

	describe('PUT /group/:id', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).put('/group/1');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `GROUP_UPDATE`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'GROUP_UPDATE';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).put('/group/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 200 and update a group', async () => {
			const userBefore = await Group.findOne({ where: { id: 3 } });

			expect(userBefore).toBeTruthy();
			expect(userBefore.name == 'newguest').toBe(false);

			const response = await request(app.getHttpServer()).put('/group/3').send({
				name: 'NewGuest',
				permissions: [ 'USER_GET', 'USER_CREATE' ]
			}).set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);

			const group = await Group.findOne({ where: { id: 3 } });
			const permissions = await group.permissions;

			expect(group).toBeTruthy();
			expect(group.name).toBe('NewGuest');
			expect(permissions.length).toBe(2);
			expect(permissions.some(p => p.permission === 'USER_CREATE')).toBe(true);
		});

		it('Should return HTTP 404 if group not found', async () => {
			const response = await request(app.getHttpServer()).put('/group/404').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(404);
		});
	});

	describe('DELETE /group/:id', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).delete('/group/1');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `GROUP_DELETE`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'GROUP_DELETE';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).delete('/group/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 204 and remove group', async () => {
			const entryBefore = await Group.findOne({ where: { id: 3 }});
			expect(entryBefore).toBeTruthy();

			const response = await request(app.getHttpServer()).delete('/group/3').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(204);

			const entryAfter = await Group.findOne({ where: { id: 3 }});
			expect(entryAfter).toBeNull();

			const entryDeleted = await Group.findOne({ where: { id: 3 }, withDeleted: true });
			expect(entryDeleted).toBeTruthy();
		});

		it('Should return HTTP 404 if group not found', async () => {
			const response = await request(app.getHttpServer()).delete('/group/404').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(404);
		});
	});
});