/* Interfaces */
import {Company, AccountType} from './general';

declare namespace API {
    export interface Account {
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

    export interface AccountDetails {
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

    export interface MyPowerUsageResponse {
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
        HasData: boolean;
        HasEstimatedBill: boolean;
        IsPartialMonth: boolean;
        RemainingDays: number;
        DaysToDate: number;
    }

    export interface GraphDataSeries {
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

    export interface GraphSetRule {
        rule: string;
        "background-color": string;
        "border-color": string;
        "border-width": string;
        tooltip: object;
        "tooltip-text": string;
        "font-color": string;
    }

    export interface GraphSetSeriesValue {
        [key: number]: number;
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
}
