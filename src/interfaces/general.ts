import { API } from "./API";

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
	servicePoints: API.ServicePoint[];
}

export interface AccountDailyData{
	accountNumber: string;
	data: DailyData[];
}

export interface DailyData {
    date: Date;
    kWh: number | null;
    cost: number | null;
}

export interface AccountMonthlyData {
	accountNumber: string | number;
	data: MonthlyData[];
}

export interface MonthlyData {
	date: Date;
	kWh?: number;
	cost?: number;
	bill?: number;
}