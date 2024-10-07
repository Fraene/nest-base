import { ValueTransformer } from "typeorm";
import { DateTime } from "luxon";

export class DateTimeTransformer implements ValueTransformer {
	public from(value?: string): DateTime {
		return DateTime.fromSQL(value);
	}

	public to(value?: DateTime): string {
		return value?.toSQL();
	}
}