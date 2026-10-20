/* Libraries */
import { parseISO, format, addDays, subMonths, isValid, parse } from "date-fns";

/* Nicor Gas (LDC=7) */
export { NicorAPI, parseAspNetDate } from './nicor';
export type { NicorConfig, NicorUsageHistoryEntry, NicorDailyUsageEntry, NicorUsageData } from './nicor';

/* Interfaces */
import { Account } from './interfaces/general';
import { API } from './interfaces/API';
import { authenticateSouthernCompany, USER_AGENT } from './auth';
import { createDebugLogger, isDebugEnabled, redactSecrets, DebugLogger } from './debug';
import { ACCOUNT_API, USAGE_API, UsageTarget, accountFiltersFromConfig, accountIdMatches, accountsFromResponses, billFactorCode, buildUsageUrl, indexServicePoints, readUsageGraph } from './usage';
import { SouthernResponse, southernFetch } from './http';

const RETRYABLE_STATUS = new Set([403, 408, 429, 500, 502, 503, 504]);

/* Interfaces */
export interface SouthernCompanyConfig{
	username: string;
	password: string;
	account?: string;
	accounts?: string[];
	company?: string;
	/** Log each auth and usage step. Passwords, tokens, and cookies are never written. */
	debug?: boolean;
}

export class SouthernCompanyAPI{
	private config?: SouthernCompanyConfig;
	public jwt?: string;
	private accounts: Account[] = [];
	private targetsByServicePoint = new Map<string, UsageTarget>();
	private targetsByAccount = new Map<number, UsageTarget>();
	private session?: Promise<Account[]>;
	private sessionReady = false;

	constructor(config?: SouthernCompanyConfig){
		if(config){
			this.config = config;
		}
	}

	private get debug(): DebugLogger {
		return createDebugLogger(isDebugEnabled(this.config));
	}

	/* Utility Methods */
	private getConfigAccounts(): Account[]{
		/* Calulating which accounts to fetch data from */
		let accounts: Account[] = this.accounts;

		const filters = accountFiltersFromConfig(this.config);
		if(filters.length){
			accounts = this.accounts.filter(a => filters.some((filter)=> this.accountSelected(a, filter)));
		}

		/* Returning accounts array */
		return accounts;
	}

	private accountSelected(account: Account, filter: string): boolean {
		if(filter === account.number.toString()){
			return true;
		}

		const target = this.targetsByAccount.get(account.number);
		return target ? accountIdMatches(target.accountId, filter) : false;
	}

	private authHeaders(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.jwt}`,
			Accept: 'application/json',
			'User-Agent': USER_AGENT,
			Origin: 'https://customerservice2.southerncompany.com',
			Referer: 'https://customerservice2.southerncompany.com/Billing/MyPowerUsage'
		};
	}

	private async apiGet(url: string, step: string): Promise<any> {
		const response = await this.fetchApi(url, step);
		const text = response.text;
		if(response.status !== 200){
			throw new Error(`${step} failed: ${response.status} ${response.statusText} ${errorDetail(text)}`);
		}

		try {
			return JSON.parse(text);
		}
		catch {
			throw new Error(`${step} failed: response was not JSON (${response.status})`);
		}
	}

	private targetForAccount(account: Account): UsageTarget {
		const target = this.targetsByAccount.get(account.number);
		if(!target){
			throw new Error(`Could not find a service agreement for account ${account.number}`);
		}
		return target;
	}

	private targetForServicePoint(servicePointNumber: string): { account: Account; target: UsageTarget } {
		const wanted = servicePointNumber.trim();
		const accounts = this.getConfigAccounts();
		const account = accounts.find((candidate)=> {
			return candidate.servicePoints.some((servicePoint)=> servicePoint.servicePointNumber === wanted || servicePoint.meterNumber === wanted);
		});
		const target = this.targetsByServicePoint.get(wanted);

		if(!account || !target){
			throw new Error(`Could not find a service point from the latest getAccounts() result (${this.targetsByServicePoint.size} ids loaded)`);
		}

		return { account, target };
	}

	/** Sign in once. Summary ids are encrypted per response, so a later login must not replace them before they are used. */
	private async ensureSession(suppliedJwt?: string): Promise<void> {
		if(suppliedJwt || (this.jwt && this.sessionReady)){
			return;
		}

		if(!this.session){
			this.session = this.login(this.config).finally(()=> {
				this.session = undefined;
			});
		}

		await this.session;
	}

	private async fetchApi(url: string, step: string): Promise<SouthernResponse> {
		const started = Date.now();
		const path = safePath(url);
		this.debug.log(step, { path });
		let response!: SouthernResponse;

		for(let attempt = 1; attempt <= 3; attempt++){
			response = await southernFetch(url, { headers: this.authHeaders() }, this.debug);
			this.debug.log(`${step}.response`, {
				status: response.status,
				path,
				elapsedMs: Date.now() - started,
				attempt
			});
			if(response.status === 200 || !RETRYABLE_STATUS.has(response.status) || attempt === 3){
				return response;
			}
			this.debug.log(`${step}.retry`, { status: response.status, attempt });
			await new Promise((resolve)=> setTimeout(resolve, 500 * attempt));
		}

		return response;
	}

	/* Public API methods */
	public async login(config?: SouthernCompanyConfig){

		// Save config if one is passed in
		if(config){
			this.config = config;
		}

		// Checking if we have a config to log in with
		if(!this.config){
			throw new Error('Could not login: No config avaliable');
		}

		this.jwt = await authenticateSouthernCompany(this.config, this.debug);

		/* Getting accounts if none are supplied */
		await this.getAccounts();
		this.sessionReady = true;

		/* Returning */
		return this.getConfigAccounts();
	}

	public async getAccounts(jwt?: string){

		// If no jwt is passed in, login
		if(!jwt && !this.jwt){
			await this.login(this.config);
			return this.getConfigAccounts();
		}

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get accounts: Not Logged In');
		}

		const capBody = await this.apiGet(`${ACCOUNT_API}/Cap/`, 'accounts.list');
		let capAccounts = arrayFrom(capBody);
		const filters = accountFiltersFromConfig(this.config);
		if(filters.length){
			capAccounts = capAccounts.filter((account)=> {
				const accountId = String(account.accountNumber ?? account.accountId ?? '');
				return filters.some((filter)=> accountIdMatches(accountId, filter));
			});
		}

		const summaries = await Promise.all(capAccounts.map(async (account)=> {
			const accountId = String(account.accountNumber ?? account.accountId);
			return this.apiGet(`${ACCOUNT_API}/Accounts/${encodeURIComponent(accountId)}/Summary`, 'accounts.summary');
		}));

		const mapped = accountsFromResponses(capAccounts, summaries);
		await this.loadBillFactors(mapped.targets);

		this.accounts = mapped.accounts;
		this.targetsByServicePoint = indexServicePoints(mapped.targets);
		this.targetsByAccount = new Map();
		for(const target of mapped.targets){
			if(!this.targetsByAccount.has(target.accountNumber)){
				this.targetsByAccount.set(target.accountNumber, target);
			}
		}

		this.debug.log('accounts.ready', { accounts: this.accounts.length, servicePoints: mapped.targets.length });
		return this.getConfigAccounts();
	}

	private async loadBillFactors(targets: UsageTarget[]): Promise<void> {
		const seen = new Set<string>();
		await Promise.all(targets.map(async (target)=> {
			const key = `${target.serviceAgreementId}:${target.company}`;
			if(seen.has(key)){
				return;
			}
			seen.add(key);

			try {
				const body = await this.apiGet(
					`${USAGE_API}/EligibilityDetails/${encodeURIComponent(target.serviceAgreementId)}/${encodeURIComponent(target.company)}`,
					'usage.eligibility'
				);
				const code = billFactorCode(body);
				if(code){
					for(const candidate of targets){
						if(candidate.serviceAgreementId === target.serviceAgreementId){
							candidate.billFactorCode = code;
						}
					}
				}
			}
			catch {
				this.debug.log('usage.eligibility.skipped', { company: target.company });
			}
		}));
	}

	/* Data methods */
	public async getMonthlyData(jwt?: string){
		await this.ensureSession(jwt);

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get monthly data: Not Logged In');
		}

		/* Calulating which accounts to fetch data from */
		let accounts = this.getConfigAccounts();
		const endDate = format(new Date(), 'MM/dd/yyyy');
		const startDate = format(subMonths(new Date(), 24), 'MM/dd/yyyy');

		/* Creating a request for each account */
		const dataRes = accounts.map(async (account)=>{
			const target = this.targetForAccount(account);
			const response = await this.fetchApi(buildUsageUrl('Monthly', target, { startDate, endDate, maxBills: '24' }), 'usage.monthly');

			/* Checking for unsuccessful monthly data request */
			if(response.status !== 200){
				throw new Error(`Failed to get monthly data for account ${account.number}: ${response.status} ${response.statusText} ${errorDetail(response.text)}`);
			}

			/* Parsing response */
			const resData = JSON.parse(response.text);
			const chartData = readUsageGraph(resData) as { series?: { usage?: { data?: any[] }; cost?: { data?: any[] } } } | null;
			const usage = chartData?.series?.usage?.data;
			if(!usage?.length){
				return {
					accountNumber: account.number,
					data: []
				};
			}

			let monthlyData = usage
				.map((d, i) => ({
					startDate: parseUsageDate(d.startDate || d.name),
					endDate: parseUsageDate(d.endDate || d.name),
					kWh: d.y,
					cost: chartData?.series?.cost?.data?.[i]?.y
				}));

			/* Adding account number to data */
			return {
				accountNumber: account.number,
				data: monthlyData
			}
		});

		/* Waiting for all requests */
		return await Promise.all(dataRes);
	}

	public async getDailyData(startDate: Date, endDate: Date, servicePointNumber: string, jwt?: string){
		await this.ensureSession(jwt);

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get daily data: Not Logged In');
		}

		/* The usage API treats the daily end date as exclusive, same as hourly. Add a day so this argument stays inclusive. */
		const startDateString = format(startDate, 'MM/dd/yyyy');
		const endDateString = format(addDays(endDate, 1), 'MM/dd/yyyy');

		const { account, target } = this.targetForServicePoint(servicePointNumber);
		const res = await this.fetchApi(buildUsageUrl('Daily', target, { startDate: startDateString, endDate: endDateString }), 'usage.daily');

		if(res.status !== 200){
			throw new Error(`Failed to get daily data for account ${account.number}: ${res.status} ${res.statusText} ${errorDetail(res.text)}`);
		}

		const data = JSON.parse(res.text);
		const graphData = readUsageGraph(data) as API.GetDailyGraphData | null;

		/* Aged-out or malformed ranges come back with no graph. */
		if(!graphData?.series?.weekdayUsage || !graphData.series.weekendUsage){
			return {
				accountNumber: account.number,
				hasData: false,
				data: []
			};
		}

		const combinedCost = [
			...(graphData.series.weekdayCost?.data || []),
			...(graphData.series.weekendCost?.data || [])
		];

		const combinedUsage = [
			...(graphData.series.weekdayUsage.data || []),
			...(graphData.series.weekendUsage.data || [])
		];

		if(!combinedUsage.length){
			return {
				accountNumber: account.number,
				hasData: false,
				data: []
			};
		}

		const combinedUsageCost = combinedUsage
		.sort((a, b) => a.x - b.x)
		.map(({name, y, x}) => {
			// Find matching cost entry by x value
			const costEntry = combinedCost.find(cost => cost.x === x);

			return {
				date: name,
				kWh: y,
				cost: costEntry?.y || 0
			};
		});

		return {
			accountNumber: account.number,
			hasData: true,
			data: combinedUsageCost.map((d)=>({
				date: parseUsageDate(d.date),
				kWh: d.kWh,
				cost: d.cost
			}))
		};
	}

	public async getHourlyData(startDate: Date, endDate: Date, servicePointNumber: string, jwt?: string){
		await this.ensureSession(jwt);

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get hourly data: Not Logged In');
		}

		/* The portal treats the hourly end date as exclusive, so add a day to keep this argument inclusive. */
		const startDateString = format(startDate, 'MM/dd/yyyy');
		const endDateString = format(addDays(endDate, 1), 'MM/dd/yyyy');

		const { account, target } = this.targetForServicePoint(servicePointNumber);
		const res = await this.fetchApi(buildUsageUrl('Hourly', target, { startDate: startDateString, endDate: endDateString }), 'usage.hourly');

		if(res.status !== 200){
			throw new Error(`Failed to get hourly data for account ${account.number}: ${res.status} ${res.statusText} ${errorDetail(res.text)}`);
		}

		const data = JSON.parse(res.text);
		const graphData = readUsageGraph(data) as API.GetHourlyGraphData | null;

		/* Aged-out or malformed ranges come back with no graph. */
		if(!graphData?.series?.usage?.data?.length){
			return {
				accountNumber: account.number,
				hasData: false,
				data: []
			};
		}

		const usageCost = graphData.series.usage.data
		.sort((a, b) => a.x - b.x)
		.map(({name, y, x})=>{
			const costEntry = graphData.series.cost?.data?.find(cost => cost.x === x);
			const tempEntry = graphData.series.temp?.data?.find(temp => temp.x === x);

			return {
				date: name,
				kWh: y,
				cost: costEntry?.y || 0,
				temp: tempEntry?.y
			};
		});

		return {
			accountNumber: account.number,
			hasData: true,
			data: usageCost.map((d)=>({
				date: parseUsageDate(d.date),
				kWh: d.kWh,
				cost: d.cost,
				temp: d.temp
			}))
		};
	}
}

function errorDetail(text: string): string {
	const trimmed = text.trim();
	if(trimmed.startsWith('{') || trimmed.startsWith('[')){
		return redactSecrets(trimmed);
	}
	return '';
}

function arrayFrom(body: any): any[] {
	const data = body?.data ?? body?.Data;
	return Array.isArray(data) ? data : [];
}

function safePath(url: string): string {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname.split('/').map((part)=> part.length > 24 ? '[id]' : part).join('/');
		return `${parsed.host}${path}`;
	}
	catch {
		return url.split('?')[0];
	}
}

function parseUsageDate(value: string): Date {
	if(!value){
		return new Date(NaN);
	}

	const iso = parseISO(value);
	if(isValid(iso)){
		return iso;
	}

	for(const pattern of ['MM/dd/yyyy HH:mm:ss', 'MM/dd/yyyy HH:mm', 'MM/dd/yyyy']){
		const parsed = parse(value, pattern, new Date());
		if(isValid(parsed)){
			return parsed;
		}
	}

	return new Date(value);
}
