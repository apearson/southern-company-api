/* Libraries */
import {EventEmitter} from 'events';
import fetch from 'node-fetch'

/* Interfaces */
import {APIResponse, GetAllAccountsResponse, Companies} from './interfaces/responses';

/* Config */
const config = require('../config.json');

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
		const resData = await response.json();

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
			company: Companies[account.Company]
		}));

		/* Filtering accounts if needed */ //TODO: Could use somework
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
	private async getMonthlyData(){
		/* Requests */
	}
}

const API = new SouthernCompanyAPI({
	username: config.username,
	password: config.password
});

API.on('connected', async ()=> {
	console.log('Connected!');

	const accounts = await API.getAccounts();

	console.log(accounts);
});
