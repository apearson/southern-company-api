/* External Interfaces */
import {Account, AccountDetails} from './general';

/* Responses Format */
export interface APILoginResponse{
	statusCode: number;
	message: string;
	isSuccess: boolean;
	modelErrors: null;
}
export interface APIResponse{
	StatusCode: number;
	Message: string;
	MessageType: number;
	Data: any;
	ModelErrors?: string[];
	IsScApiResult: boolean;
}

/* Responses */
export interface LoginResponse extends APILoginResponse{
	data: {
		result: number;
		token: string;
		errorMessage: string;
		messages: string[];
		username: string;
		rememberUsername: null;
		staySignedIn: null;
		recaptchaResponse: null;
		targetPage: number;
		params: object;
		html: string;
		redirect: null;
		origin: null;
	}
}
export interface JwtTokenResponse extends APIResponse{
	Data: {
		Token: null;
		Sid: null;
	};
}

export interface GetAllAccountsResponse extends APIResponse{
	Data: Account[];
}
export interface AccountDetailsResponse extends APIResponse{
	Data: AccountDetails;
}
export interface MonthlyDataResponse extends APIResponse{
	Data: {
		Data: string;
		HighTempIndex: number;
		LowTempIndex: number;
		TemperatureIndex: number;
		NotificationIndex: number;
		AboveAlertIndex: number;
		DailyAlertIndex: number;
		WeekendIndex: number;
		ReminderIndex: number;
		ProjectedBillAmountHigh: null;
		ProjectedBillAmountLow: null;
		AverageDailyCost: null;
		Days: number;
		DollarsToDate: null;
		TotalkWhUsed: number;
		HasData:boolean;
		HasEstimatedBill: boolean;
		IsPartialMonth: boolean;
		RemainingDays: number;
		DaysToDate: number;

	}
}