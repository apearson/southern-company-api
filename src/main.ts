/* Libraries */
import fetch from 'node-fetch';
import { parseISO, format, addDays, subYears, isValid, parse } from "date-fns";

/* Nicor Gas (LDC=7) */
export { NicorAPI, parseAspNetDate } from './nicor';
export type { NicorConfig, NicorUsageHistoryEntry, NicorDailyUsageEntry, NicorUsageData } from './nicor';

/* Interfaces */
import { Account } from './interfaces/general';
import { API } from './interfaces/API';
import { authenticateSouthernCompany, USER_AGENT } from './auth';
import { createDebugLogger, isDebugEnabled, redactSecrets, DebugLogger } from './debug';
import { ACCOUNT_API, USAGE_API, UsageTarget, accountIdMatches, accountsFromResponses, billFactorCode, buildUsageUrl, readUsageGraph } from './usage';

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

		if(this.config?.accounts){
			accounts = this.accounts.filter(a => this.config!.accounts?.some((filter)=> this.accountSelected(a, filter)));
		}
		else if(this.config?.account){
			accounts = this.accounts.filter(a => this.accountSelected(a, this.config!.account as string));
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
		this.debug.log(step, { path: safePath(url) });
		const response = await fetch(url, { headers: this.authHeaders() });
		const text = await response.text();
		this.debug.log(`${step}.response`, { status: response.status, path: safePath(url) });
		if(response.status !== 200){
			throw new Error(`${step} failed: ${response.status} ${response.statusText} ${redactSecrets(text)}`);
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
		const accounts = this.getConfigAccounts();
		const account = accounts.find((candidate)=> {
			return candidate.servicePoints.some((servicePoint)=> servicePoint.servicePointNumber === servicePointNumber);
		});
		const target = this.targetsByServicePoint.get(servicePointNumber);

		if(!account || !target){
			throw new Error(`Could not find account with service point number ${servicePointNumber}`);
		}

		return { account, target };
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
		const filters = this.accountFilters();
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
		this.targetsByServicePoint = new Map(mapped.targets.map((target)=> [target.servicePointNumber, target]));
		this.targetsByAccount = new Map();
		for(const target of mapped.targets){
			if(!this.targetsByAccount.has(target.accountNumber)){
				this.targetsByAccount.set(target.accountNumber, target);
			}
		}

		this.debug.log('accounts.ready', { accounts: this.accounts.length, servicePoints: mapped.targets.length });
		return this.getConfigAccounts();
	}

	private accountFilters(): string[] {
		const filters = [...(this.config?.accounts ?? [])];
		if(this.config?.account){
			filters.push(this.config.account);
		}
		return filters;
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
		// If no jwt is passed in, login
		if(!jwt){
			await this.login(this.config)
		}

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get monthly data: Not Logged In');
		}

		/* Calulating which accounts to fetch data from */
		let accounts = this.getConfigAccounts();
		const endDate = format(new Date(), 'MM/dd/yyyy');
		const startDate = format(subYears(new Date(), 10), 'MM/dd/yyyy');

		/* Creating a request for each account */
		const dataRes = accounts.map(async (account)=>{
			const target = this.targetForAccount(account);
			const response = await fetch(buildUsageUrl('Monthly', target, { startDate, endDate, maxBills: '120' }), {
				method: 'GET',
				headers: this.authHeaders()
			});

			/* Checking for unsuccessful monthly data request */
			if(response.status !== 200){
				throw new Error(`Failed to get monthly data for account ${account.number}: ${response.status} ${response.statusText} ${redactSecrets(await response.text())}`);
			}

			/* Parsing response */
			const resData = await response.json();
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
		// If no jwt is passed in, login
		if(!jwt){
			await this.login(this.config)
		}

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get daily data: Not Logged In');
		}

		/* The portal sends these dates as an inclusive range. */
		const startDateString = format(startDate, 'MM/dd/yyyy');
		const endDateString = format(endDate, 'MM/dd/yyyy');

		const { account, target } = this.targetForServicePoint(servicePointNumber);
		const res = await fetch(buildUsageUrl('Daily', target, { startDate: startDateString, endDate: endDateString }), {
			method: 'GET',
			headers: this.authHeaders()
		});

		if(res.status !== 200){
			throw new Error(`Failed to get daily data for account ${account.number}: ${res.status} ${res.statusText} ${redactSecrets(await res.text())}`);
		}

		const data = await res.json();
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
		// If no jwt is passed in, login
		if(!jwt){
			await this.login(this.config)
		}

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get hourly data: Not Logged In');
		}

		/* The portal treats the hourly end date as exclusive, so add a day to keep this argument inclusive. */
		const startDateString = format(startDate, 'MM/dd/yyyy');
		const endDateString = format(addDays(endDate, 1), 'MM/dd/yyyy');

		const { account, target } = this.targetForServicePoint(servicePointNumber);
		const res = await fetch(buildUsageUrl('Hourly', target, { startDate: startDateString, endDate: endDateString }), {
			method: 'GET',
			headers: this.authHeaders()
		});

		if(res.status !== 200){
			throw new Error(`Failed to get hourly data for account ${account.number}: ${res.status} ${res.statusText} ${redactSecrets(await res.text())}`);
		}

		const data = await res.json();
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

function arrayFrom(body: any): any[] {
	const data = body?.data ?? body?.Data;
	return Array.isArray(data) ? data : [];
}

function safePath(url: string): string {
	try {
		const parsed = new URL(url);
		return `${parsed.host}${parsed.pathname}`;
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
