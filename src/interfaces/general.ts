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

/* Account Interfaces */
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