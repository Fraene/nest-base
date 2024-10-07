import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Group } from "./group.entity";

@Entity('group-permissions')
export class GroupPermission extends BaseEntity {
	@ManyToOne(() => Group, g => g.permissions, { onDelete: 'CASCADE' })
	@PrimaryColumn({ type: 'bigint', unsigned: true, name: 'groupId' })
	public group: Group;
	@Column()
	@PrimaryColumn()
	public permission: string;
	@Column()
	public allow: boolean;
}