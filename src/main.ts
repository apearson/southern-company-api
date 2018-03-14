/* Libraries */
import {EventEmitter} from 'events';
import fetch from 'node-fetch'

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
	private username: string;
	private password: string;

	constructor(config: SouthernCompanyConfig){
		super();

		/* Saving config */
		this.username = config.username;
		this.password = config.password;

		/* DEBUG: Testing config */
		this.login();
	}

	private async login(){
		/* Request Verification Token */
		const loginToken = await this.getRequestVerificationToken();

		/* ScWebToken */
		const ScWebToken = await this.getScWebToken(loginToken, this.username, this.password);



		console.log(ScWebToken);
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
		/* Grab a ScwebToken by log in */
		const response = await fetch('https://webauth.southernco.com/api/login?WL_ReturnUrl=null', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				RequestVerificationToken: requestVerificationToken,
			},
			body: JSON.stringify({username, password})
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
		const response = await fetch('https://customerservice2.southerncompany.com/Account/LogginValidated/JwtToken')

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get JWT: ${response.statusText}`);
		}

	}

	private async doStuff(){
		const res = await fetch('https://home.apearson.io/');
		const data = await res.text();

		console.log(data);
	}
}

new SouthernCompanyAPI({
	username: config.username,
	password: config.password
});
