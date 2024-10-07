import { Column, Entity, OneToMany } from "typeorm";
import { BaseModel } from "../../common/models/base-model.model";
import { User } from "./user.entity";
import { GroupPermission } from "./group-permission.entity";

@Entity('groups')
export class Group extends BaseModel {
	@Column()
	public name: string;
	@Column()
	public protected: boolean;
	@OneToMany(() => User, (user) => user.group)
	public users: Promise<User[]>;
	@OneToMany(() => GroupPermission, p => p.group)
	public permissions: Promise<GroupPermission[]>;

	public async HasPermission(permission: string): Promise<boolean> {
		const groupPerms = await this.permissions;

		return groupPerms.some((perm) => perm.permission === permission && perm.allow);
	}
}