/* Libraries */
import fetch, { RequestRedirect } from 'node-fetch';
import { parseISO } from "date-fns";

/* Interfaces */
import { Company, Account } from './interfaces/general';
import {GetAllAccountsResponse, LoginResponse, MonthlyDataResponse} from './interfaces/responses';

/* Interfaces */
export interface SouthernCompanyConfig{
	username: string;
	password: string;
	account?: string;
	accounts?: string[];
	company?: string;
}

export class SouthernCompanyAPI{
	private config?: SouthernCompanyConfig;
	public jwt?: string;
	private accounts: Account[] = [];

	constructor(config?: SouthernCompanyConfig){
		if(config){
			this.config = config;
		}
	}

	/* Utility Methods */
	private getConfigAccounts(): Account[]{
		/* Calulating which accounts to fetch data from */
		let accounts: Account[] = this.accounts;

		if(this.config?.accounts){
			accounts = this.accounts.filter(a => this.config!.accounts?.includes(a.number.toString()));
		}
		else if(this.config?.account){
			accounts = this.accounts.filter(a => this.config!.account?.includes(a.number.toString()));
		}

		/* Returning accounts array */
		return accounts;
	}

	/* API methods */
	private async getRequestVerificationToken(username: string, password: string){
		/* Grabbing login page */
		const response = await fetch('https://webauth.southernco.com/webservices/api/WebUser/Login', {
			method: 'POST',
			headers: {
				"referer": "https://webauth.southernco.com/SPA/OCC/login",
				"content-type": "application/json"
			},
			body: JSON.stringify({
				"username": username,
				"password": password
			})
		});

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get request verification token: ${response.statusText} ${await response.text()}`);
		}

		/* Converting login page response to text to search for token */
		const res = await response.json();

		return  res.data.token;
	}

	private async getScWebToken(requestVerificationToken: string){
		/* Checking if there is a valid config */
		if(!this.config)
			throw new Error(`Failed to get ScWebToken: Need a valid config`);

		/* Grab a ScWebToken by log in */
		const options = {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'Referer': 'https://webauth.southernco.com/SPA/OCC/login',
			},
			body: new URLSearchParams({
				Token: requestVerificationToken,
				ReturnUrl: 'none'
			})
		};

		const response = await fetch('https://webauth.southernco.com/SPA/Navigation', options);

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get ScWebToken: ${response.statusText} ${await response.text()} ${JSON.stringify(options)}`);
		}

		const res = await response.text();

		/* Regex to match token in response */
		const matchRegex = /name="ScWebToken" value="(\S+\.\S+\.\S+)"/mi;

		/* Matching response's form to get ScWebToken */
		const data = matchRegex.exec(res);
		const ScWebToken =  data != null ? data[1] : null;

		if(ScWebToken == undefined)
			throw new Error(`Could not find ScWebToken in response`)

			/* Returning ScWebToken */
		return ScWebToken;
	}

	private async getJwt(ScWebToken: string){
		/* Trading ScWebToken for Jwt */
		const swtoptions = {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'Referer': 'https://webauth.southernco.com/'
			},
			body: new URLSearchParams({
				ScWebToken: ScWebToken,
			}),
			redirect: "manual" as RequestRedirect
		};

		const swtresponse = await fetch('https://customerservice2.southerncompany.com/Account/LoginComplete?ReturnUrl=/Billing/Home', swtoptions);

		/* Checking for unsuccessful login */
		if(swtresponse.status !== 302){
			const cook = swtresponse.headers.get('set-cookie');
			throw new Error(`Failed to get secondary ScWebToken: ${swtresponse.statusText} ${cook} ${JSON.stringify(swtoptions)}`);
		}
				/* Regex to parse JWT out of headers */
		const swtregex = /SouthernJwtCookie=(\S*);/i;

		/* Parsing response header to get token */
		let swtoken: string;
		let swtcookies = swtresponse.headers.get('set-cookie');

		if(swtcookies){
			const swtmatches = swtcookies.match(swtregex);

			/* Checking for matches */
			if(swtmatches && swtmatches.length > 1){
				swtoken = swtmatches[1];
			}
			else{
				throw new Error(`Failed to get secondary ScWebToken: Could not find any token matches in headers`);
			}
		}
		else{
			throw new Error(`Failed to get secondary ScWebToken: No Cookies were sent back`);
		}

		// Now fetch JWT after secondary ScWebToken
		const options = {
			headers:{
				Cookie: `SouthernJwtCookie=${swtoken}`
			}
		};

		const response = await fetch('https://customerservice2.southerncompany.com/Account/LoginValidated/JwtToken', options);

		if(response.status !== 200){
			throw new Error(`Failed to get JWT: ${response.statusText} ${await response.text()} ${JSON.stringify(options)}`);
		}

		/* Regex to parse JWT out of headers */
		const regex = /ScJwtToken=(\S*);/i;

		/* Parsing response header to get token */
		let token: string;
		let cookies = response.headers.get('set-cookie');

		if(cookies){
			const matches = cookies.match(regex);

			/* Checking for matches */
			if(matches && matches.length > 1){
				token = matches[1];
			}
			else{
				throw new Error(`Failed to get JWT: Could not find any token matches in headers`);
			}
		}
		else{
			throw new Error(`Failed to get JWT: No Cookies were sent back`);
		}

		/* Returning JWT */
		return token;
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

		/* Request Verification Token */
		const loginToken = await this.getRequestVerificationToken(this.config.username, this.config.password);

		/* ScWebToken */
		const ScWebToken = await this.getScWebToken(loginToken);

		/* Saving JWT */
		this.jwt = await this.getJwt(ScWebToken);

		/* Getting accounts if none are supplied */
		this.accounts = await this.getAccounts();

		/* Returning */
		return this.getConfigAccounts();
	}

	public async getAccounts(jwt?: string){

		// If no jwt is passed in, login
		if(!jwt && !this.jwt){
			await this.login(this.config)
		}

		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get accounts: Not Logged In');
		}

		/* Grabbing accounts from API */
		const options = {
			headers: {
				Authorization: `bearer ${this.jwt}`
			}
		};
		const response = await fetch('https://customerservice2api.southerncompany.com/api/account/getAllAccounts', options);

		/* Checking for unsuccessful api call */
		if(response.status !== 200){
			throw new Error(`Failed to get accounts: ${response.statusText} ${JSON.stringify(options)}`);
		}

		/* Parsing response */
		const resData: GetAllAccountsResponse = await response.json() as GetAllAccountsResponse;

		/* Parsing accounts from response */
		let accounts: Account[] = resData.Data.map((account)=>({
			name: account.Description,
			primary: account.PrimaryAccount,
			number: account.AccountNumber,
			company: Company[account.Company]
		}));

		/* Filtering accounts if needed */
		if(this.config?.account || this.config?.accounts){
			/* Creating accounts array to compare against */
			const accountsFilter = this.config.accounts ?? [];
			if(this.config.account){
				/* If only one account then place it in the array */
				accountsFilter.push(this.config.account);
			}

			/* Filtering accounts */
			accounts = accounts.filter((account)=> accountsFilter.includes(account.number.toString()));
		}

		/* Returning accounts */
		return accounts;
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

		/* Creating a request for each account */
		const requests = accounts.map((account)=>{
			return fetch(`https://customerservice2api.southerncompany.com/api/MyPowerUsage/MPUData/${account.number}/Monthly?OPCO=${account.company}`, {
				method: 'GET',
				headers: {
					Authorization: `bearer ${this.jwt}`
				}
			});
		});

		/* Waiting for all requests */
		const responses = await Promise.all(requests);

		/* Converting all responses to json */
		const resData = await Promise.all(responses.map((response)=> response.json())) as MonthlyDataResponse[];

		/* Grabbing data from all responses */
		const monthlyData = resData.filter(response => {
			return JSON.parse(response.Data.Data) !== null;
		}).map((response, index)=> {
			/* Parsing graph data */
			const chartData = JSON.parse(response.Data.Data);

			/* Checking to see if there is any optional data */
			let monthlyData = chartData.series.usage.data
				.map((d, i) => ({
					startDate: parseISO(d.startDate),
					endDate: parseISO(d.endDate),
					kWh: d.y,
					cost: chartData.series.cost.data[i].y
				}));

			return monthlyData;
		});

		/* Returning monthly data */
		return monthlyData;
	}
}