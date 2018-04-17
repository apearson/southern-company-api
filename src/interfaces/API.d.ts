/* Interfaces */
import {Company, AccountType} from './general';

declare namespace API{
	export interface Account{
		UserSid: string;
		AccountNumber: number;
		Company: Company;
		AccountType: AccountType;
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
	export interface AccountDetails{
		AccountOpenedDate: Date;
		AccountClosedDate: Date;
		ServiceAccountType: number;
		ServiceAccountTypeName: string;
		AccountCategory: number;
		AccountCategoryName: string;
		IsMasterAccount: boolean
		IsOneTimePayEligible: boolean
		IsPaperlessEligible: boolean
		BillDeliveryOption: {
				accountNumber: number
				accountNumberDisplay: string
				deliveryType: number
				emailAddress: string;
				sendEmail: boolean;
				remindersChecked: boolean;
				reminderDays: number;
				deliveryAction: number;
				dtCreate: Date;
				emailChangeOnly: boolean;
				emailValidationRequired: boolean;
				autoValidate: boolean;
				sendSomewhereElse: boolean;
				billCodeDeliveryType: number;
				requestSource: null
		}
		BillCodeDeliveryType: number;
		BillDraftType: number;
		CustomerNumber: string;
		ReportLevel: string;
		BuildingNumber: number;
		DepositOnHand: number;
		MailingAddressKey: number;
		PaymentArrangementStatus: null;
		Balance: number;
		BillAcctType: string;
		IsCashOnly: boolean;
		OperatingCenter: string;
		Last4SSN: string;
		UserSid: string;
		AccountNumber: number;
		AccountNumberDisplay: string;
		Company: Company;
		AccountType: AccountType;
		Description: string;
		PrimaryAccount: string;
		IsCurrentViewAccount: boolean
		DataPresentmentParticipant: null;
		BillStatus: number;
		IsLocked: boolean;
		AccountLockedUntil: null
		IsPinRequired: boolean;
		IsPinValidated: boolean;
		SSN: string;
		CustomerName: string;
		LocalAddress: {
				Number: string;
				Structure: string;
				Note: string;
				PreDirection: string;
				StreetName: string;
				PostDirection: string;
				StreetType: string;
				AddressLine1: string;
				AddressLine2: string;
				AddressLine3: string;
				City: string;
				State: string;
				Zip: string;
		}
		Home: {
				AreaCode: string;
				Number: string;
				Extension: string;
		}
		Business: {
				AreaCode: string;
				Number: string;
				Extension: string;
		}
		IsPrePay: boolean
		IsClosedPrePay: boolean;
		ServicePointNumber: null
		Bill: null
		BillPrePay: null
		BankAccounts: null
		PremiseNumber: string;
		FirstName: string;
		LastName: string;
		MiddleName: string;
	}
	export interface MyPowerUsageResponse{
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

	export interface GraphDataSeries{
		type: string;
		scales: string;
		values: GraphSetSeriesValue[];
		text: string;
		"font-family": string;
		"background-color": string;
		"legend-item": object;
		rules: GraphSetRule[];
		"tooltip-text": string;
		"data-dateTime": any[];
		tooltip: object;
		"legend-marker": object;
	}
	export interface GraphSetRule{
		rule: string;
		"background-color": string;
		"border-color": string;
		"border-width": string;
		tooltip: object;
		"tooltip-text": string;
		"font-color": string;
	}
	export interface GraphSetSeriesValue{
		[key: number]: number;
	}
}
