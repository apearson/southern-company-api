/* Responses */
export interface APIResponse{
	StatusCode: number;
	Message: string;
	MessageType: number;
	Data: any;
	IsScApiResult: boolean;
}

export interface GetAllAccountsResponse extends APIResponse{
	Data: SouthernCompanyAccount[];
}

export interface SouthernCompanyAccount{
	UserSid: string;
	AccountNumber: number;
	Company: 0 | 1 | 2 | 3 | 4;
	AccountType: number;
	Description: string;
	PrimaryAccount: 'Y' | 'N';
	IsCurrentViewAccount: boolean;
	DataPresentmentPilotParticipant: string;
	BillStatus: number;
	IsLocked: boolean;
	AccountLockedUntil: null;
	IsPinRequired: boolean;
	IsPinValidated: boolean;
	LocalAddress: null;
	PremiseNumber: null;
	IsPrePayAccount: boolean;
}

export enum Companies{
	'SCS',
	'APC',
	'GPC',
	'GULF',
	'MPC',
}
