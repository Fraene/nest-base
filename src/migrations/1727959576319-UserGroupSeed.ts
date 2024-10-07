import { MigrationInterface, QueryRunner } from "typeorm";
import * as argon2 from "argon2";

export class UserGroupSeed1727959576319 implements MigrationInterface {
    name = 'UserGroupSeed1727959576319';

    private groups = [
        { id: 1, name: 'Admin', protected: true, permissions: [ 'GROUP_LIST', 'GROUP_GET', 'GROUP_CREATE', 'GROUP_UPDATE', 'GROUP_DELETE', 'USER_LIST', 'USER_GET', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE' ] },
        { id: 2, name: 'User', permissions: [ 'GROUP_LIST', 'GROUP_GET', 'USER_LIST', 'USER_GET' ] },
        { id: 3, name: 'Guest' }
    ];

    private users = [
        { id: 1, name: 'Admin', email: 'admin@test.com', password: '123456', group: 1 },
        { id: 2, name: 'User', email: 'user@test.com', password: '123456', group: 2 },
        { id: 3, name: 'Guest', email: 'guest@test.com', password: '123456', group: 3 }
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        for(const group of this.groups){
            await queryRunner.query(`INSERT INTO \`groups\` (id, name, protected) VALUES (${group.id}, '${group.name}', ${group.protected ? 1 : 0})`);
            if(group.permissions?.length)
                await queryRunner.query(`INSERT INTO \`group-permissions\` (groupId, permission, allow) VALUES ${group.permissions.map(p => `(${group.id}, '${p}', 1)`).join(', ')}`);
        }

        for(const user of this.users){
            const password = (await argon2.hash(user.password)).toString()
            await queryRunner.query(`INSERT INTO \`users\` (id, username, email, password, groupId) VALUES (${user.id}, '${user.name}', '${user.email}', '${password}', ${user.group})`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM \`users\` WHERE id IN (${this.users.map(u => u.id).join(', ')})`);
        await queryRunner.query(`DELETE FROM \`groups\` WHERE id IN (${this.groups.map(g => g.id).join(', ')})`);
    }

}
