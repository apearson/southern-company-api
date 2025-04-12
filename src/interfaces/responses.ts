/* External Interfaces */
import {API} from './API';

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
	Data: API.Account[];
}
export interface AccountDetailsResponse extends APIResponse{
	Data: API.AccountDetails;
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
export interface DailyDataResponse extends APIResponse{
	Data: API.MyPowerUsageResponse
}

export interface GetAllBillsResponse extends APIResponse{
	Data: API.AllBills[];
}

export interface GetServicePointNumbersResponse extends APIResponse{
	Data: {
		estimatedBillIndicator: boolean;
    isOnlyEligibleForMonthly: boolean,
    isSolarActiveAccount: boolean,
    meterAndServicePoints: ServicePoint[];
	}
}

export interface ServicePoint {
	servicePointNumber: string;
	meterNumber: string;
}

export interface GetDailyGraphData {
  xAxis: {
    labels: string[];
  };
  series: {
    costDelayed: {
      data: any[];
    };
    usageDelayed: {
      data: any[];
    };
    weekdayCost: {
      data: {
        x: number;
        y: number;
        name: string;
        resolution: string;
      }[];
    };
    weekdayUsage: {
      data: {
        x: number;
        y: number;
        name: string;
        resolution: string;
      }[];
    };
    weekendCost: {
      data: {
        x: number;
        y: number;
        name: string;
        resolution: string;
      }[];
    };
    weekendUsage: {
      data: {
        x: number;
        y: number;
        name: string;
        resolution: string;
      }[];
    };
    overage: {
      data: any[];
    };
    reminder: {
      data: any[];
    };
    notifications: {
      data: any[];
    };
    highTemp: {
      data: {
        x: number;
        y: number;
        name: string;
        resolution: string;
      }[];
    };
    lowTemp: {
      data: {
        x: number;
        y: number;
        name: string;
        resolution: string;
      }[];
    };
    avgDailyCost: {
      data: {
        x: number;
        y: number;
        name: string;
        resolution: string;
      }[];
    };
    alertCost: {
      data: any[];
    };
    solarGeneration: {
      data: any[];
    };
    solarGenerationDelayed: {
      data: any[];
    };
  };
  dailyDataSource: string;
}
