/* Libraries */
import {EventEmitter} from 'events';
import fetch from 'node-fetch'

/* Interfaces */
import {Company} from './interfaces/general';
import {APIResponse, GetAllAccountsResponse, LoginResponse, MonthlyDataResponse} from './interfaces/responses';
import { start } from 'repl';
import { debug } from 'util';

/* Interfaces */
export interface SouthernCompanyConfig{
	username: string;
	password: string;
	account?: string;
	accounts?: string[];
}

export default class SouthernCompanyAPI extends EventEmitter{
	private config?: SouthernCompanyConfig;
	private jwt?: string;
	private company?: Company;

	constructor(config?: SouthernCompanyConfig){
		super();

		/* Saving config */
		this.config = config;

		/* Connecting to Souther Company API */
		if(config){
			this.login().then((jwt)=>{
				/* Saving JWT */
				this.jwt = jwt;

				/* Emitting connected event */
				this.emit('connected');
			});
		}
	}

	private async login(){
		/* Making sure we have a config to login with */
		if(!this.config){
			throw new Error('Can not login: No config');
		}

		/* Request Verification Token */
		const loginToken = await this.getRequestVerificationToken();

		/* ScWebToken */
		const ScWebToken = await this.getScWebToken(loginToken, this.config.username, this.config.password);

		/* JWT */
		const JWT = await this.getJwt(ScWebToken);

		/* Returning */
		return JWT;
	}

	/* Utility Methods */
	private getAccountsArray(){
		/* Calulating which accounts to fetch data from */
		let accounts: string[] = [];
		if(this.config){
			if(this.config.accounts){
				accounts = this.config.accounts;
			}
			else if(this.config.account){
				accounts.push(this.config.account);
			}
		}

		/* Returning accounts array */
		return accounts;
	}
	private formatDate(date){
		return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} 12:00:00 AM`;
	}
	private dataSort(a, b){
		if(a[0] > b[0]) return 1;
		else if(a[0] < b[0]) return -1;
		else return 0;
	}

	/* API methods */
	private async getRequestVerificationToken(){
		/* Grabbing login page */
		const response = await fetch('https://webauth.southernco.com/account/login');

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get request verification token: ${response.statusText}`);
		}

		/* Converting login page response to text to search for token */
		const loginPage = await response.text();

		/* Regex to match token on page */
		const regex = /webAuth\.aft = '(\S+)'/i;

		/* Matching page and finding token */
		let token: string;
		const matches = loginPage.match(regex);
		if(matches && matches.length > 1){
			token = matches[1];
		}
		else{
			throw new Error(`Could not find request verification token on login page`);
		}

		/* Returning request verification token */
		return token;
	}
	private async getScWebToken(requestVerificationToken: string, username: string, password: string){
		/* Checking if there is a valid config */
		if(!this.config){
			throw new Error(`Failed to get ScWebToken: Need a valid config`);
		}

		/* Grab a ScwebToken by log in */
		const response = await fetch('https://webauth.southernco.com/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				RequestVerificationToken: requestVerificationToken,
			},
			body: JSON.stringify({username, password, params: {ReturnUrl: "null"}})
		});

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get ScWebToken: ${response.statusText}`);
		}

		/* Parsing response as JSON to match search response for token */
		const resData: LoginResponse = await response.json();

		/* Regex to match token in response */
		const regex = /<input type='hidden' name='ScWebToken' value='(\S+)'>/i;

		/* Matching response's form to get ScWebToken */
		let ScWebToken: string;
		const matches = resData.data.html.match(regex);
		if(matches && matches.length > 1){
			ScWebToken = matches[1];
		}
		else{
			throw new Error(`Could not find ScWebToken in response`);
		}

		/* Returning ScWebToken */
		return ScWebToken;

	}
	private async getJwt(ScWebToken: string){
		/* Trading ScWebToken for Jwt */
		const response = await fetch('https://customerservice2.southerncompany.com/Account/LogginValidated/JwtToken', {
			headers:{
				Cookie: `ScWebToken=${ScWebToken}`
			}
		});

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get JWT: ${response.statusText}`);
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
	public async getAccounts(){
		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Get not get accounts: Not Logged In');
		}

		/* Grabbing accounts from API */
		const response = await fetch('https://customerservice2api.southerncompany.com/api/account/getAllAccounts', {
			headers: {
				Authorization: `bearer ${this.jwt}`
			}
		});

		/* Checking for unsuccessful api call */
		if(response.status !== 200){
			throw new Error(`Failed to get accounts: ${response.statusText}`);
		}

		/* Parsing response */
		const resData: GetAllAccountsResponse = await response.json();

		/* Parsing accounts from response */
		let accounts = resData.Data.map((account)=>({
			name: account.Description,
			primary: account.PrimaryAccount,
			number: account.AccountNumber,
			company: Company[account.Company]
		}));

		/* Filtering accounts if needed */
		if(this.config && (this.config.account || this.config.accounts)){
			/* Creating accounts array to compare against */
			const accountsFilter = this.config.accounts || [];
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
	public async getDailyData(startDate: Date, endDate: Date){
		/* Sanity checking arguments */
		if(endDate < startDate){
			throw new Error('Invalid Dates');
		}

		/* Calulating which accounts to fetch data from */
		let accounts = this.getAccountsArray();

		/* Formatting dates for API */
		startDate.setDate(startDate.getDate() - 1);

		/* Requests */
		const requests = accounts.map((account)=>{
			/* Requests holder */
			const requests = [];

			/* Cost Request */
			const costRequest = fetch('https://customerservice2api.southerncompany.com/api/MyPowerUsage/DailyGraph', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8',
					Authorization: `bearer ${this.jwt}`,
				},
				body: JSON.stringify({
					accountNumber: account,
					StartDate: this.formatDate(startDate),
					EndDate: this.formatDate(endDate),
					DataType: 'Cost',
					OPCO: 'APC',
					intervalBehavior: 'Automatic'
				})
			});

			/* Usage Request */
			const usageRequest = fetch('https://customerservice2api.southerncompany.com/api/MyPowerUsage/DailyGraph', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8',
					Authorization: `bearer ${this.jwt}`,
				},
				body: JSON.stringify({
					accountNumber: account,
					StartDate: this.formatDate(startDate),
					EndDate: this.formatDate(endDate),
					DataType: 'Usage',
					OPCO: 'APC',
					intervalBehavior: 'Automatic'
				})
			});

			/* Returning array of requests */
			return [costRequest, usageRequest];
		});

		/* Promising everything! */
		const responses = await Promise.all(requests.map((accountPromises)=> Promise.all(accountPromises)));

		/* Parsing out responses */
		responses.map(async (accountResponses)=>{
			/* Parsing responses to JSON */
			const accountResData = await Promise.all(accountResponses.map((res)=> res.json()));

			/* Parsing out graphsets from data */
			const data = accountResData.map((resData)=> JSON.parse(resData.Data.Data).graphset[0]);

			/* For both cost and usage, find both weekend and weekday series, concat them together */
			const usageData = data.map((data)=>{
				let dataArray = [];

				/* Make sure series are not empty (no data) */
				if(data.series != null){
					data.series.forEach((series)=>{
						if(series.text === 'Regular Usage' || series.text === 'Weekend'){
							dataArray = dataArray.concat(series.values);
						}
					});
				}

				/* Sorting the data based on day number */
				dataArray.sort(this.dataSort);

				/* Giving back completed arrays */
				return dataArray;
			});

			debugger;
		});

	}
	public async getMonthlyData(){
		/* Calulating which accounts to fetch data from */
		let accounts = this.getAccountsArray();

		/* Creating a request for each account */
		const requests = accounts.map((account)=>{
			return fetch('https://customerservice2api.southerncompany.com/api/MyPowerUsage/MonthlyGraph', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8',
					Authorization: `bearer ${this.jwt}`
				},
				body: JSON.stringify({
					accountNumber: account,
					OnlyShowCostAndUsage: false,
					IsWidget: false,
				})
			});
		});

		/* Waiting for all requests */
		const responses = await Promise.all(requests);

		/* Converting all responses to json */
		const resData: MonthlyDataResponse[] = await Promise.all(responses.map((response)=> response.json()));

		/* Grabbing data from all responses */
		const monthlyData = resData.map((response, index)=>{
			/* Parsing graph data */
			const graphData = JSON.parse(response.Data.Data);

			// DEBUG
			throw new Error('Not implemented');

			/* Creating response object */
			let result = {
				accountNumber: accounts[index],
			};
		});
	}
}