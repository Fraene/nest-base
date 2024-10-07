import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1727874519783 implements MigrationInterface {
    name = 'Init1727874519783'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`group-permissions\` (\`groupId\` bigint UNSIGNED NOT NULL, \`permission\` varchar(255) NOT NULL, \`allow\` tinyint NOT NULL, PRIMARY KEY (\`groupId\`, \`permission\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`groups\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`name\` varchar(255) NOT NULL, \`protected\` tinyint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user-permissions\` (\`userId\` bigint UNSIGNED NOT NULL, \`permission\` varchar(255) NOT NULL, \`allow\` tinyint NOT NULL, PRIMARY KEY (\`userId\`, \`permission\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deletedAt\` datetime(6) NULL, \`username\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`groupId\` bigint UNSIGNED NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`group-permissions\` ADD CONSTRAINT \`FK_c72130dc38b914e042a24697301\` FOREIGN KEY (\`groupId\`) REFERENCES \`groups\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user-permissions\` ADD CONSTRAINT \`FK_95ae8c92259717c22ced22437bc\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_b1d770f014b76f7cfb58089dafc\` FOREIGN KEY (\`groupId\`) REFERENCES \`groups\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_b1d770f014b76f7cfb58089dafc\``);
        await queryRunner.query(`ALTER TABLE \`user-permissions\` DROP FOREIGN KEY \`FK_95ae8c92259717c22ced22437bc\``);
        await queryRunner.query(`ALTER TABLE \`group-permissions\` DROP FOREIGN KEY \`FK_c72130dc38b914e042a24697301\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP TABLE \`user-permissions\``);
        await queryRunner.query(`DROP TABLE \`groups\``);
        await queryRunner.query(`DROP TABLE \`group-permissions\``);
    }

}
