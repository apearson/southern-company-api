/* Data Enums */
export enum Company{
	'SCS',
	'APC',
	'GPC',
	'GULF',
	'MPC',
}
export enum AccountType{
	'',
	'Personal',
}

/* Method Response Types */
export interface Account{
	name: string;
	primary: 'Y' | 'N';
	number: number;
	company: string;
}
export interface DailyData{
	accountNumber: string;
	data: {
		date: Date;
		kWh: number;
		cost: number;
	}[];
}

export interface MonthlyData{
	accountNumber: string;
	data: {
		date: Date;
		kWh: number;
		cost: number;
	}[];
}