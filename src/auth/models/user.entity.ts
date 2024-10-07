import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseModel } from "../../common/models/base-model.model";
import { Group } from "./group.entity";
import { UserPermission } from "./user-permission.entity";

@Entity('users')
export class User extends BaseModel {
	@Column()
	public username: string;
	@Column()
	public email: string;
	@Column({ select: false })
	public password: string;
	@ManyToOne(() => Group, g => g.users, { eager: true })
	public group: Group;
	@OneToMany(() => UserPermission, p => p.user)
	public permissions: Promise<UserPermission[]>;

	public async HasPermission(permission: string): Promise<boolean> {
		const userPerms = await this.permissions;

		const perm = userPerms.find(p => p.permission === permission);

		if(perm)
			return perm.allow;

		return await this.group.HasPermission(permission);
	}
}