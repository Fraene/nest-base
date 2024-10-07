import { BaseEntity, CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { DateTime } from "luxon";
import { DateTimeTransformer } from "../util/luxon.transformer";

export class BaseModel extends BaseEntity {
	@PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
	public id: number;

	@CreateDateColumn({ transformer: new DateTimeTransformer() })
	public createdAt?: DateTime;

	@UpdateDateColumn({ transformer: new DateTimeTransformer() })
	public updatedAt?: DateTime;

	@DeleteDateColumn({ transformer: new DateTimeTransformer() })
	public deletedAt?: DateTime;
}