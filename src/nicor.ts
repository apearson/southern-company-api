/* Libraries */
import fetch, { RequestRedirect } from 'node-fetch';

/* Interfaces */
export interface NicorConfig {
	username: string;
	password: string;
}

export interface NicorUsageHistoryEntry {
	Date: string;
	MeterReading: string;
	ReadingDetails: string;
	CCfs: number;
	Therms: number;
	DaysUsed: number;
}

export interface NicorDailyUsageEntry {
	date: Date;
	dayOfWeek: string;
	therms: number;
	cost: number;
	avgTemp: number;
	meterRead: number;
	readType: string;
	billingPeriod: string;
}

export interface NicorUsageData {
	usageHistory: NicorUsageHistoryEntry[];
	dailyUsage: NicorDailyUsageEntry[];
	projectedBill: number;
	accountId: string;
}

/* Parses ASP.NET's /Date(1234567890000)/ serialization to a JavaScript Date */
export function parseAspNetDate(dateStr: string): Date {
	const match = /\/Date\((-?\d+)\)\//.exec(dateStr);
	if (!match) throw new Error(`Invalid ASP.NET date string: ${dateStr}`);
	return new Date(parseInt(match[1], 10));
}

export class NicorAPI {
	private config?: NicorConfig;
	private cookies: string = '';

	constructor(config?: NicorConfig) {
		if (config) {
			this.config = config;
		}
	}

	/* node-fetch v2 exposes multiple Set-Cookie headers via headers.raw() */
	private parseSetCookieHeaders(headers: any): string {
		const setCookies: string[] = headers.raw()['set-cookie'] || [];
		return setCookies
			.map((cookie: string) => {
				const match = cookie.match(/^([^=]+=[^;]+)/);
				return match ? match[1] : '';
			})
			.filter((c: string) => c)
			.join('; ');
	}

	private async getRequestVerificationToken(): Promise<string> {
		const response = await fetch('https://customerportal.southerncompany.com/User/Login?LDC=7', {
			headers: { 'User-Agent': 'Mozilla/5.0' }
		});

		if (response.status !== 200) {
			throw new Error(`Failed to load login page: ${response.statusText}`);
		}

		const html = await response.text();
		const match = /name="__RequestVerificationToken"[^>]+value="([^"]+)"/i.exec(html);
		if (!match) throw new Error('Could not find __RequestVerificationToken in login page');

		this.cookies = this.parseSetCookieHeaders(response.headers);
		return match[1];
	}

	public async login(config?: NicorConfig): Promise<void> {
		if (config) this.config = config;
		if (!this.config) throw new Error('Could not login: No config available');

		const token = await this.getRequestVerificationToken();

		const loginResponse = await fetch('https://customerportal.southerncompany.com/User/Login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'Mozilla/5.0',
				'Cookie': this.cookies,
				'Referer': 'https://customerportal.southerncompany.com/User/Login?LDC=7'
			},
			body: new URLSearchParams({
				__RequestVerificationToken: token,
				UserName: this.config.username,
				Password: this.config.password,
				RememberMe: 'false',
				loginbtn: 'Login'
			}).toString(),
			redirect: 'manual' as RequestRedirect
		});

		if (loginResponse.status !== 302 && loginResponse.status !== 200) {
			throw new Error(`Login failed: ${loginResponse.statusText}`);
		}

		const newCookies = this.parseSetCookieHeaders(loginResponse.headers);
		if (newCookies) {
			this.cookies = this.cookies ? `${this.cookies}; ${newCookies}` : newCookies;
		}
	}

	public async getNicorUsageHistory(): Promise<NicorUsageData> {
		if (!this.cookies) throw new Error('Not logged in. Call login() first.');

		// The login POST redirects to /Account/AccountSummary where the server
		// sets the auth session cookie — follow it once to pick that cookie up.
		const summaryResp = await fetch('https://customerportal.southerncompany.com/Account/AccountSummary', {
			headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': this.cookies },
			redirect: 'manual' as RequestRedirect
		});
		const summaryCookies = this.parseSetCookieHeaders(summaryResp.headers);
		if (summaryCookies) this.cookies = `${this.cookies}; ${summaryCookies}`;

		const response = await fetch('https://customerportal.southerncompany.com/MeterDataManagement/UsageHistory', {
			headers: {
				'User-Agent': 'Mozilla/5.0',
				'Cookie': this.cookies,
				'Referer': 'https://customerportal.southerncompany.com/'
			}
		});

		if (response.status !== 200) {
			throw new Error(`Failed to get usage history: ${response.statusText}`);
		}

		const html = await response.text();
		const vmodelMatch = /var vmodel = '([^']+)'/.exec(html);
		if (!vmodelMatch) throw new Error('Could not find vmodel data in UsageHistory page');
		const vmodel = JSON.parse(vmodelMatch[1]);

		const accountIdMatch = /id="AccountID"[^>]+value="([^"]+)"/.exec(html);
		const accountId = accountIdMatch ? accountIdMatch[1] : '';

		const rawPeriods: any[] = vmodel.AMIUsageMData?.DailyUsage ?? [];
		const dailyUsage: NicorDailyUsageEntry[] = rawPeriods.flatMap(period =>
			(period.LabelsHDate as string[]).map((dateStr, i) => ({
				date: parseAspNetDate(dateStr),
				dayOfWeek: period.WeekDayorWeekEnd[i],
				therms: period.DailyThermsList[i],
				cost: period.DailyCostsList[i],
				avgTemp: period.DailyAvgTempData[i],
				meterRead: period.MeterReads[i],
				readType: period.ReadType[i],
				billingPeriod: period.BillingPeriodDatesListKey,
			}))
		);

		return {
			usageHistory: vmodel.UsageHistoryCollection,
			dailyUsage,
			projectedBill: vmodel.AMIUsageMData?.lowRangeBillAmt ?? 0,
			accountId,
		};
	}
}
