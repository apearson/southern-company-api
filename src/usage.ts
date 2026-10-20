import { Company } from './interfaces/general';
import { Account } from './interfaces/general';
import { API } from './interfaces/API';

export const ACCOUNT_API = 'https://occaccountapi.southerncompany.com/api/v1';
export const USAGE_API = 'https://occmypowerusageapi.southerncompany.com/api/v1/MyPowerUsage';

const KNOWN_COMPANIES = new Set(['SCS', 'APC', 'GPC', 'GULF', 'MPC']);
const SKIPPED_AGREEMENT_STATUS = new Set(['Closed', 'Incomplete', 'Canceled']);
/** Statuses the usage page will actually chart, best first. */
const PREFERRED_AGREEMENT_STATUS = ['Active', 'PendingStop', 'Stopped'];

export interface UsageTarget {
	accountNumber: number;
	accountId: string;
	company: string;
	name: string;
	primary: 'Y' | 'N';
	servicePointNumber: string;
	meterNumber: string;
	servicePointId: string;
	serviceAgreementId: string;
	premiseId: string;
	personId?: string;
	billFactorCode?: string;
}

export function accountsFromResponses(capBody: unknown, summaryBodies: unknown[]): { accounts: Account[]; targets: UsageTarget[] } {
	const capAccounts = arrayData(capBody);
	const summaries = summaryBodies.map((body)=> objectData(body));
	const targets: UsageTarget[] = [];
	const accounts: Account[] = [];

	for(const cap of capAccounts){
		const accountId = stringValue(cap.accountNumber ?? cap.accountId);
		if(!accountId){
			continue;
		}

		const summary = summaries.find((item)=> accountIdMatches(stringValue(item.accountId ?? item.accountNumber), accountId)) || {};
		const company = companyCode(summary.divisionCode ?? cap.divisionCode ?? cap.company ?? summary.company);
		const accountNumber = toAccountNumber(accountId);
		const name = stringValue(cap.description ?? summary.description ?? summary.customerName);
		const primary = isPrimary(cap) || isPrimary(summary) ? 'Y' as const : 'N' as const;
		const personId = stringValue(summary.mainPersonId) || undefined;
		const servicePoints: API.ServicePoint[] = [];

		for(const agreement of selectAgreements(summary.serviceAgreements)){
			const agreementId = stringValue(agreement.serviceAgreementId);
			if(!agreementId){
				continue;
			}

			const premiseId = stringValue(agreement.premiseId);
			const points = Array.isArray(agreement.servicePoints) && agreement.servicePoints.length
				? agreement.servicePoints
				: [{ servicePointId: agreementId }];

			for(const point of points){
				const servicePointId = stringValue(point.servicePointId ?? point.servicePointNumber ?? agreementId);
				const meterNumber = stringValue(point.meterNumber ?? point.meterId);
				const servicePointNumber = stringValue(point.servicePointNumber ?? point.servicePointId ?? agreementId);
				servicePoints.push({ meterNumber, servicePointNumber });
				targets.push({
					accountNumber,
					accountId,
					company,
					name,
					primary,
					servicePointNumber,
					meterNumber,
					servicePointId,
					serviceAgreementId: agreementId,
					premiseId,
					personId
				});
			}
		}

		accounts.push({
			name,
			primary,
			number: accountNumber,
			company,
			servicePoints
		});
	}

	return { accounts, targets };
}

export function buildUsageUrl(kind: 'Daily' | 'Hourly' | 'Monthly', target: UsageTarget, extra: Record<string, string> = {}): string {
	const params = new URLSearchParams();
	const query: Record<string, string> = {
		accountId: target.accountId,
		operatingCompany: target.company,
		servicePointId: target.servicePointId,
		premiseId: target.premiseId,
		intervalBehavior: 'Automatic',
		...extra
	};
	if(target.personId){
		query.personId = target.personId;
	}
	if(target.billFactorCode){
		query.billFactorCode = target.billFactorCode;
	}
	if(kind === 'Monthly' && !query.maxBills){
		query.maxBills = '24';
	}

	for(const [key, value] of Object.entries(query)){
		if(value){
			params.set(key, value);
		}
	}

	return `${USAGE_API}/UsageGraphData/${encodeURIComponent(target.serviceAgreementId)}/${kind}?${params.toString()}`;
}

export function readUsageGraph(body: unknown): Record<string, any> | null {
	if(!body || typeof body !== 'object'){
		return null;
	}

	const root = body as Record<string, any>;
	const data = root.data ?? root.Data;
	if(!data || typeof data !== 'object'){
		return null;
	}

	if(data.hasData === false || data.HasData === false){
		return null;
	}

	const inner = data.data ?? data.Data;
	if(typeof inner === 'string'){
		try {
			const parsed = JSON.parse(inner);
			return parsed && typeof parsed === 'object' ? parsed : null;
		}
		catch {
			return null;
		}
	}

	if(inner && typeof inner === 'object'){
		if(inner.hasData === false || inner.HasData === false){
			return null;
		}
		return inner;
	}

	if(data.series){
		return data;
	}

	return null;
}

export function billFactorCode(body: unknown): string | undefined {
	const data = objectData(body);
	const characteristics = data.eligibilityCharacteristics;
	const code = characteristics?.billFactorCode;
	return typeof code === 'string' && code ? code : undefined;
}

/** Empty `accounts` means no filter. An encrypted service-point id is only valid for the summary that issued it. */
export function accountFiltersFromConfig(config?: { account?: string; accounts?: string[] }): string[] {
	const filters = (config?.accounts ?? []).map((value)=> value.trim()).filter((value)=> value.length > 0);
	const account = config?.account?.trim();
	if(account){
		filters.push(account);
	}
	return filters;
}

export function indexServicePoints(targets: UsageTarget[]): Map<string, UsageTarget> {
	const index = new Map<string, UsageTarget>();
	for(const target of targets){
		for(const key of [target.servicePointNumber, target.servicePointId, target.meterNumber]){
			if(key && !index.has(key)){
				index.set(key, target);
			}
		}
	}
	return index;
}

export function accountIdMatches(accountId: string, filter: string): boolean {
	if(filter === accountId){
		return true;
	}

	const numericId = String(parseInt(accountId, 10));
	const numericFilter = String(parseInt(filter, 10));
	return filter === numericId || (numericFilter !== 'NaN' && numericFilter === numericId);
}

function selectAgreements(value: unknown): any[] {
	if(!Array.isArray(value)){
		return [];
	}

	const electric = value.filter((agreement)=> {
		const type = stringValue(agreement?.serviceTypeCode ?? agreement?.serviceType);
		return !type || type === 'E' || type.toLowerCase() === 'electric';
	});
	const pool = electric.length ? electric : value;
	const usable = pool.filter((agreement)=> !SKIPPED_AGREEMENT_STATUS.has(agreementStatus(agreement)));
	const preferred = usable.filter((agreement)=> PREFERRED_AGREEMENT_STATUS.includes(agreementStatus(agreement)));
	const chosen = preferred.length ? preferred : usable.length ? usable : pool;
	return [...chosen].sort((left, right)=> {
		const subtype = agreementRank(left) - agreementRank(right);
		return subtype || statusRank(left) - statusRank(right);
	});
}

function agreementStatus(agreement: any): string {
	return stringValue(agreement?.statusCode ?? agreement?.status);
}

function statusRank(agreement: any): number {
	const rank = PREFERRED_AGREEMENT_STATUS.indexOf(agreementStatus(agreement));
	return rank >= 0 ? rank : PREFERRED_AGREEMENT_STATUS.length;
}

function agreementRank(agreement: any): number {
	const subtype = stringValue(agreement?.serviceSubTypeCode ?? agreement?.serviceSubType);
	if(subtype === 'E'){
		return 0;
	}
	if(subtype === 'L'){
		return 1;
	}
	return 2;
}

function companyCode(value: unknown): string {
	if(typeof value === 'string' && value){
		const code = value.toUpperCase();
		if(KNOWN_COMPANIES.has(code)){
			return code;
		}
	}

	if(typeof value === 'number' && Company[value]){
		return Company[value];
	}

	if(typeof value === 'string' && /^\d+$/.test(value) && Company[Number(value)]){
		return Company[Number(value)];
	}

	return 'SCS';
}

function isPrimary(record: any): boolean {
	return record?.isPrimaryAccount === true || record?.primaryAccount === 'Y' || record?.PrimaryAccount === 'Y';
}

function arrayData(body: unknown): any[] {
	if(Array.isArray(body)){
		return body;
	}
	const data = objectData(body);
	if(Array.isArray(data)){
		return data;
	}
	const nested = (body as any)?.data ?? (body as any)?.Data;
	return Array.isArray(nested) ? nested : [];
}

function objectData(body: unknown): any {
	if(!body || typeof body !== 'object'){
		return {};
	}
	const record = body as any;
	const data = record.data ?? record.Data;
	if(data && typeof data === 'object' && !Array.isArray(data)){
		return data;
	}
	return record;
}

function stringValue(value: unknown): string {
	if(typeof value === 'string'){
		return value;
	}
	if(typeof value === 'number' && Number.isFinite(value)){
		return String(value);
	}
	return '';
}

function toAccountNumber(accountId: string): number {
	const parsed = parseInt(accountId, 10);
	return Number.isFinite(parsed) ? parsed : 0;
}
