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

export interface AccountMonthlyData{
	accountNumber: string;
	data: MonthlyData[];
}
export interface MonthlyData{
	date: Date;
	kWh?: number;
	cost?: number;
	bill?: number;
}

export interface AllBills {
    sid?: string;
    token?: string;
    userID?: any;
    webAuthEmail?: any;
    webAuthPhone?: any;
    fullName?: any;
    firstName?: any;
    lastName?: any;
    propertyManager?: any;
    accounts?: Account[];
    currentAccount?: any;

    LocalAddress: {
        number?: string;
        structure?: string;
        note?: string;
        preDirection?: string;
        streetName?: string;
        postDirection?: string;
        streetType?: string;
        addressLine1?: string;
        addressLine2?: string;
        addressLine3?: string;
        city?: string;
        state?: string;
        zip?: string;
    }

    Bill: {
        accountNumber?: any;
        opCo?: number;
        periodStart?: string;
        periodEnd?: string;
        maxDate?: string;
        payDueDate?: string;
        totalDue?: number;
        isCashOnly?: boolean;
        isTaxOnly?: boolean;
        isWebPaymentEligible?: boolean;
        extensionDate?: Date;
        disconnect?: boolean;
        isPastDue?: boolean;
        disconnectAmount?: number;
        previousAmount?: number;
        previousServiceAmount?: number;
        totalAmountBilled?: number;
        cutOut?: boolean;
        cnp?: boolean;
        pendingPayment?: number;
        pendingPaymentDate?: string;
        premiseNumber?: number;
        billMessages?: any[];
        disconnectMessage?: any;
        disconnectPopupMessage?: any;
        disconnectAmountString?: any;
        disconnectDateString?: any;
        pendingPayments?: any[];
        eftEnrolled?: boolean;
        eftDraftInEffect?: boolean;
        payDraftDate?: any;
        eftStatus?: any;
        nextCollAction?: Date;
        amountToEndCollections?: number;
        flatBillChangedAmount?: number;
        orderType?: string;
        pendingConnectDisconnectDate?: string;
        creditAmount?: number;
        isEFTDraftDateValid?: boolean;
        isBankruptcyAccount?: boolean;
        isLakeLotAccount?: boolean;
        isFinalNotEligible?: boolean;
        isNotEligibleForPayment?: boolean;
        isNotEligibleToPayWithBankAccount?: boolean;
        paymentInEligiblilityCode?: number;
        isPrePay?: boolean;
        isMasterAccount?: boolean;
        isEligibleToPay?: boolean;
        paymentIneligibleReason?: any;
        hasPaymentArrangement?: boolean;
        pmtArrDueDate?: Date;
        pmtArrCurrentDueAmount?: number;
        pmtArrCollArrangeTotal?: number;
        disconnectAmountAfterPaymentDue?: number;
        returnedCheckAmount?: number;
        returnedCheckFee?: number;
        returnedCheckReason?: any;
        isRestrictedPaymentDateToToday?: boolean;
        restrictedPaymentDateToTodayHelpText?: any;
    }

    Account: {
        userSid?: string;
        accountNumber?: any;
        encryptedAccountNumber?: any;
        accountNumberDisplay?: string;
        company?: number;
        accountType?: number;
        description?: string;
        primaryAccount?: string;
        isCurrentViewAccount?: boolean;
        isNicknameChanged?: boolean;
        isPrimaryAccountChanged?: boolean;
        dataPresentmentParticipant?: any;
        billStatus?: number;
        isLocked?: boolean;
        accountLockedUntil?: any;
        isPinRequired?: boolean;
        isPinValidated?: boolean;
        ssn?: any;
        customerName?: any;
        localAddress?: any;
        home?: any;
        business?: any;
        isPrePay?: boolean;
        isClosedPrePay?: boolean;
        servicePointNumber?: any;
        bill?: any;
        billPrePay?: any;
        bankAccounts?: any;
        premiseNumber?: string;
        firstName?: any;
        lastName?: any;
        middleName?: any;
        isInGulfDivestiturePilot?: boolean;
    }

    BillDeliveryOption: {
        accountNumber?: number;
        accountNumberDisplay?: string;
        deliveryType?: number;
        emailAddress?: string;
        sendEmail?: boolean;
        remindersChecked?: boolean;
        reminderDays?: number;
        deliveryAction?: number;
        dtCreate?: any;
        emailChangeOnly?: boolean;
        emailValidationRequired?: boolean;
        autoValidate?: boolean;
        sendSomewhereElse?: boolean;
        billCodeDeliveryType?: number;
        requestSource?: any;
    }

    LocalAddress2: {
        number?: string;
        structure?: string;
        note?: string;
        preDirection?: string;
        streetName?: string;
        postDirection?: string;
        streetType?: string;
        addressLine1?: string;
        addressLine2?: string;
        addressLine3?: string;
        city?: string;
        state?: string;
        zip?: string;
    }

    Home: {
        areaCode?: string;
        number?: string;
        extension?: string;
    }

    Business: {
        areaCode?: string;
        number?: string;
        extension?: string;
    }

    CurrentAccount: {
        accountOpenedDate?: Date;
        accountClosedDate?: Date;
        serviceAccountType?: number;
        serviceAccountTypeName?: string;
        accountCategory?: number;
        accountCategoryName?: string;
        isMasterAccount?: boolean;
        isOneTimePayEligible?: boolean;
        isPaperlessEligible?: boolean;
        billDeliveryOption?: any;
        billCodeDeliveryType?: number;
        billDraftType?: number;
        customerNumber?: string;
        reportLevel?: string;
        buildingNumber?: number;
        depositOnHand?: number;
        mailingAddressKey?: number;
        paymentArrangementStatus?: any;
        balance?: number;
        billAcctType?: string;
        isCashOnly?: boolean;
        operatingCenter?: string;
        last4SSN?: string;
        userSid?: string;
        accountNumber?: number;
        encryptedAccountNumber?: any;
        accountNumberDisplay?: string;
        company?: number;
        accountType?: number;
        description?: string;
        primaryAccount?: string;
        isCurrentViewAccount?: boolean;
        isNicknameChanged?: boolean;
        isPrimaryAccountChanged?: boolean;
        dataPresentmentParticipant?: any;
        billStatus?: number;
        isLocked?: boolean;
        accountLockedUntil?: any;
        isPinRequired?: boolean;
        isPinValidated?: boolean;
        ssn?: string;
        customerName?: string;
        localAddress?: any;
        home?: any;
        business?: any;
        isPrePay?: boolean;
        isClosedPrePay?: boolean;
        servicePointNumber?: any;
        bill?: any;
        billPrePay?: any;
        bankAccounts?: any;
        premiseNumber?: string;
        firstName?: string;
        lastName?: string;
        middleName?: string;
        isInGulfDivestiturePilot?: boolean;
	}
}