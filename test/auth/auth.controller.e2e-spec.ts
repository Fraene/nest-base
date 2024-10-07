import { INestApplication } from "@nestjs/common";
import { getTestModule } from "../test.module";
import { DataSource } from "typeorm";
import * as request from 'supertest';
import { User } from "../../src/auth/models/user.entity";

describe('AuthController', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const module = await getTestModule();

		app = module.createNestApplication();
        await app.init();
	});

	afterAll(async () => {
		const connection = app.get(DataSource);
		await connection.dropDatabase();
		await connection.destroy();
		await app.close();
	});

	describe('/login', () => {
		it('Should return HTTP 200 and token for correct credentials', async () => {
			const response = await request(app.getHttpServer())
				.post('/auth/login')
				.send({
					login: 'admin@test.com',
					password: '123456'
				});
			expect(response.status).toBe(200);
			expect(typeof response.body.token).toBe('string');
			expect(response.body.token).toBeTruthy();
		});

		it('Should return HTTP 401 for incorrect password', async () => {
			const response = await request(app.getHttpServer()).post('/auth/login').send({
				login: 'admin@test.com',
                password: 'incorrectpassword'
			});
			expect(response.status).toBe(401);
		})

		it('Should return HTTP 401 for incorrect login', async () => {
			const response = await request(app.getHttpServer()).post('/auth/login').send({
                login: 'incorrect@test.com',
                password: '123456'
            });
            expect(response.status).toBe(401);
		})

		it('Should return HTTP 401 for missing login', async () => {
			const response = await request(app.getHttpServer()).post('/auth/login').send({
				password: '123456'
			})
			expect(response.status).toBe(401);
		})
	});

	describe('/register', () => {
		it('Should return HTTP 201 and create a user', async () => {
			const response = await request(app.getHttpServer()).post('/auth/register').send({
				username: 'TestUser',
				email: 'test@test.com',
				password: '123456'
			});

			expect(response.status).toBe(201);

			const user = await User.findOne({ order: { id: 'DESC' }, where: { deletedAt: null } });

			expect(user).toBeDefined();
            expect(user.username).toBe('TestUser');
            expect(user.email).toBe('test@test.com');
			// expect(user.password).toMatch(/^\$argon2id/g);
			expect(user.group.id).toBe('2');
		});

		it('Should return HTTP 400 if the email is already in use', async () => {
			const response = await request(app.getHttpServer()).post('/auth/register').send({
				username: 'TestUser',
				email: 'admin@test.com',
				password: '123456'
			});

			expect(response.status).toBe(400);
		})
	});

	describe('/refresh', () => {
		let token!: string;

		beforeAll(async () => {
			const adminLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
				login: 'admin@test.com',
				password: '123456'
			});

			token = adminLoginResponse.body.token;
		});

		it('Should return HTTP 200 and a token', async () => {
			const response = await request(app.getHttpServer()).post('/auth/refresh').set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(typeof response.body.token).toBe('string');
            expect(response.body.token).toBeTruthy();
		});

		it('Should return HTTP 401 if Authorization is missing', async () => {
			const response = await request(app.getHttpServer()).post('/auth/refresh');
            expect(response.status).toBe(401);
		});
	});
})