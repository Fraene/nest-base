import { INestApplication } from "@nestjs/common";
import { cleanUp, getTestModule } from "../test.module";
import * as request from 'supertest';
import { UserPermission } from "../../src/auth/models/user-permission.entity";
import { User } from "../../src/auth/models/user.entity";

describe('UserController', () => {
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
		await cleanUp(app);
	});

	describe('GET /user', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).get('/user');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `USER_LIST`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'USER_LIST';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).get('/user').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 200 and list of users', async () => {
			const response = await request(app.getHttpServer()).get('/user').set('Authorization', `Bearer ${adminToken}`);
            expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(3);
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(3);
		});

		it('Should limit page size', async () => {
			const response = await request(app.getHttpServer()).get('/user?page=1&perPage=2').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(2);
			expect(response.body.data[0].id).toBe("1");
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(3);
		});

		it('Should paginate', async () => {
			const response = await request(app.getHttpServer()).get('/user?page=2&perPage=2').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(1);
			expect(response.body.data[0].id).toBe("3");
            expect(response.body.total).toBe(3);
            expect(response.body.filtered).toBe(3);
		});

		it('Should filter by username', async () => {
			const response = await request(app.getHttpServer()).get('/user?filters[name]=guest').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(1);
			expect(response.body.data[0].username).toBe('Guest');
			expect(response.body.data[0].email).toBe('guest@test.com');
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(1);
		});

		it('Should be sortable', async () => {
			const response = await request(app.getHttpServer()).get('/user?sortBy=id&sortDir=desc').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(3);
			let prev: string;
			expect(response.body.data.every(u => (!prev || u.id < prev) && (prev = u.id))).toBe(true);
			expect(response.body.total).toBe(3);
			expect(response.body.filtered).toBe(3);
		})
	});

	describe('GET /user/:id', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).get('/user/1');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `USER_GET`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'USER_GET';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).get('/user/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 200 and user data', async () => {
			const response = await request(app.getHttpServer()).get('/user/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);
			expect(response.body.id).toBe('1');
			expect(response.body.username).toBe('Admin');
            expect(response.body.email).toBe('admin@test.com');
			expect(response.body.password).toBeUndefined();
			expect(response.body.group.id).toBe('1');
		});

		it('Should return HTTP 404 if user not found', async () => {
			const response = await request(app.getHttpServer()).get('/user/404').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(404);
		});
	});

	describe('POST /user', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).post('/user');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `USER_CREATE`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'USER_CREATE';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).post('/user').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 201 and create a user', async () => {
			const response = await request(app.getHttpServer()).post('/user').send({
                name: 'TestUser',
                email: 'testuser@test.com',
                password: 'password123',
				group: 2
            }).set('Authorization', `Bearer ${adminToken}`);
            expect(response.status).toBe(201);

			const user = await User.findOne({ order: { id: 'DESC' }, where: { deletedAt: null } });

			expect(user).toBeTruthy();
			expect(user.username).toBe('TestUser');
			expect(user.email).toBe('testuser@test.com');
			expect(user.group.id).toBe('2');
		});

		it('Should return HTTP 400 if the email is already in use', async () => {
			const response = await request(app.getHttpServer()).post('/user').send({
				name: 'TestUser',
				email: 'admin@test.com',
				password: 'password123',
				group: 2
			}).set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(400);
		});
	});

	describe('PUT /user/:id', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).put('/user/1');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `USER_UPDATE`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'USER_UPDATE';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).put('/user/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 200 and update a user', async () => {
			const userBefore = await User.findOne({ where: { id: 3 } });

			expect(userBefore).toBeTruthy();
			expect(userBefore.username == 'newguest').toBe(false);

			const response = await request(app.getHttpServer()).put('/user/3').send({
				name: 'newguest',
				email: 'newguest@test.com',
				group: 2
			}).set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(200);

			const user = await User.findOne({ where: { id: 3 } });

			expect(user).toBeTruthy();
			expect(user.username).toBe('newguest');
			expect(user.email).toBe('newguest@test.com');
			expect(user.group.id).toBe('2');
		});

		it('Should return HTTP 400 if the email is already in use', async () => {
			const response = await request(app.getHttpServer()).put('/user/3').send({
				email: 'admin@test.com'
			}).set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(400);
		});

		describe('Should only change password if `changePassword` is true', () => {
			it('`changePassword` = false', async () => {
				const before = await User.findOne({ select: { password: true, id: true }, where: { id: 3 } });
				const response = await request(app.getHttpServer()).put('/user/3').send({
					changePassword: false,
					newPassword: '654321'
				}).set('Authorization', `Bearer ${adminToken}`);

				expect(response.status).toBe(200);

				const after = await User.findOne({ select: { password: true, id: true }, where: { id: 3 } });
				expect(after.password).toBe(before.password);
			});

			it('`changePassword` = true', async () => {
				const before = await User.findOne({ select: { password: true, id: true }, where: { id: 3 } });
				const response = await request(app.getHttpServer()).put('/user/3').send({
					changePassword: true,
					newPassword: '654321'
				}).set('Authorization', `Bearer ${adminToken}`);

				expect(response.status).toBe(200);

				const after = await User.findOne({ select: { password: true, id: true }, where: { id: 3 } });
				expect(after.password == before.password).toBe(false);
			})
		});

		it('Should return HTTP 404 if user not found', async () => {
			const response = await request(app.getHttpServer()).put('/user/404').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(404);
		});
	});

	describe('DELETE /user/:id', () => {
		it('Should return HTTP 401 if not logged in', async () => {
			const response = await request(app.getHttpServer()).delete('/user/1');
			expect(response.status).toBe(401);
		});

		it('Should return HTTP 403 if user is barred from `USER_DELETE`', async () => {
			const permissionEntry = UserPermission.create();
			permissionEntry.permission = 'USER_DELETE';
			permissionEntry.user = <User>{ id: 1 };
			permissionEntry.allow = false;
			await permissionEntry.save();

			const response = await request(app.getHttpServer()).delete('/user/1').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(403);

			await permissionEntry.remove();
		});

		it('Should return HTTP 204 and remove user', async () => {
			const entryBefore = await User.findOne({ where: { id: 3 }});
			expect(entryBefore).toBeTruthy();

			const response = await request(app.getHttpServer()).delete('/user/3').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(204);

			const entryAfter = await User.findOne({ where: { id: 3 }});
			expect(entryAfter).toBeNull();

			const entryDeleted = await User.findOne({ where: { id: 3 }, withDeleted: true });
			expect(entryDeleted).toBeTruthy();
		});

		it('Should return HTTP 404 if user not found', async () => {
			const response = await request(app.getHttpServer()).delete('/user/404').set('Authorization', `Bearer ${adminToken}`);
			expect(response.status).toBe(404);
		});
	});
});