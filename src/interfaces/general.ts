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

/* Internal Types */
export interface UsageData{
	[key:number]: number | null;
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
		kWh: number | null;
		cost: number | null;
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