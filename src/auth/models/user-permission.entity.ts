import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('user-permissions')
export class UserPermission extends BaseEntity {
	@ManyToOne(() => User, u => u.permissions, { onDelete: 'CASCADE' })
	@PrimaryColumn({ type: 'bigint', unsigned: true, name: 'userId' })
	public user: User;
	@Column()
	@PrimaryColumn()
	public permission: string;
	@Column()
	public allow: boolean;
}