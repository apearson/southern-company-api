/* Libraries */
import {EventEmitter} from 'events';
import fetch from 'node-fetch';
import {differenceInCalendarDays, subDays, addDays} from 'date-fns';

/* Interfaces */
import {Company, DailyData, AccountMonthlyData, MonthlyData, Account, UsageData} from './interfaces/general';
import {GetAllAccountsResponse, LoginResponse, MonthlyDataResponse, DailyDataResponse} from './interfaces/responses';
import {API} from './interfaces/API';

/* Interfaces */
export interface SouthernCompanyConfig{
	username: string;
	password: string;
	account?: string;
	accounts?: string[];
}

export class SouthernCompanyAPI extends EventEmitter{
	private config: SouthernCompanyConfig;
	private jwt?: string;
	private company?: Company;

	constructor(config: SouthernCompanyConfig){
		super();

		/* Saving config */
		this.config = config;

		/* Connecting to Southern Company API */
		this.login().then((accounts)=>{
			/* Emitting connected event */
			this.emit('connected', accounts);
		});
	}

	private async login(){
		/* Request Verification Token */
		const loginToken = await this.getRequestVerificationToken();

		/* ScWebToken */
		const ScWebToken = await this.getScWebToken(loginToken, this.config.username, this.config.password);

		/* Saving JWT */
		this.jwt = await this.getJwt(ScWebToken);

		/* Getting accounts if none are supplied */
		if(this.config.account == undefined && this.config.accounts == undefined){
			const accounts = await this.getAccounts();
			this.config.accounts = accounts.map((account)=> account.number.toString());
		}

		/* Returning */
		return this.getAccountsArray();
	}

	/* Utility Methods */
	private getAccountsArray(){
		/* Calulating which accounts to fetch data from */
		let accounts: string[] = [];
		if(this.config.accounts){
			accounts = this.config.accounts;
		}
		else if(this.config.account){
			accounts.push(this.config.account);
		}

		/* Returning accounts array */
		return accounts;
	}
	private static formatDate(date){
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
			throw new Error(`Failed to get request verification token: ${response.statusText} ${await response.text()}`);
		}

		/* Converting login page response to text to search for token */
		const loginPage = await response.text();

		/* Regex to match token on page */
		const regex = /data-aft="(\S+)"/i;

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

		/* Grab a ScWebToken by log in */
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'RequestVerificationToken': requestVerificationToken,
			},
			body: JSON.stringify({username, password, params: {ReturnUrl: "null"}})
		};
		const response = await fetch('https://webauth.southernco.com/api/login', options);

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get ScWebToken: ${response.statusText} ${await response.text()} ${JSON.stringify(options)}`);
		}

		/* Parsing response as JSON to match search response for token */
		const resData: LoginResponse = await response.json();
		//console.log(response.headers);
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
		//console.log(await response.text());
		return ScWebToken;

	}
	private async getJwt(ScWebToken: string, supplauthtoken: string=''){
		/* Trading ScWebToken for Jwt */
		const options = {
			headers:{
				Cookie: `ScWebToken=${ScWebToken}`,
				'f5avrbbbbbbbbbbbbbbbb': supplauthtoken
			}
		};
		const response = await fetch('https://customerservice2.southerncompany.com/Account/LoginValidated/JwtToken', options);

		/* Checking for unsuccessful login */
		if(response.status !== 200){
			throw new Error(`Failed to get JWT: ${response.statusText} ${await response.text()} ${JSON.stringify(options)}`);
		}

		/* Regex to parse JWT out of headers */
		const regex = /ScJwtToken=(\S*);/i;
		//console.log(response);

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
				if (supplauthtoken=='') {
					const regex2 = /f5avrbbbbbbbbbbbbbbbb=(\S*);/i;
					const matches2 = cookies.match(regex2);
					if(matches2 && matches2.length > 1){
						supplauthtoken = matches2[1];
					}
					console.log(`Trying with supplauthtoken ${supplauthtoken}`);
					const jwt = await this.getJwt(ScWebToken,supplauthtoken);
					return jwt;
				}
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
		const resData: GetAllAccountsResponse = await response.json();

		/* Parsing accounts from response */
		let accounts: Account[] = resData.Data.map((account)=>({
			name: account.Description,
			primary: account.PrimaryAccount,
			number: account.AccountNumber,
			company: Company[account.Company]
		}));

		/* Filtering accounts if needed */
		if(this.config.account || this.config.accounts){
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
		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get daily data: Not Logged In');
		}

		/* Sanity checking arguments */
		if(endDate < startDate){
			throw new Error('Invalid Dates');
		}

		/* Calulating which accounts to fetch data from */
		let accounts = this.getAccountsArray();

		/* Formatting dates for API */
		let correctedStartDate = subDays(startDate, 1);

		/* Requests */
		const requests = accounts.map((account)=>{
			/* Usage Request */
			const usageRequest = fetch('https://customerservice2api.southerncompany.com/api/MyPowerUsage/DailyGraph', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8',
					Authorization: `bearer ${this.jwt}`,
				},
				body: JSON.stringify({
					accountNumber: account,
					StartDate: SouthernCompanyAPI.formatDate(correctedStartDate),
					EndDate: SouthernCompanyAPI.formatDate(endDate),
					DataType: 'Usage',
					OPCO: 'APC',
					intervalBehavior: 'Automatic'
				})
			});

			/* Cost Request */
			const costRequest = fetch('https://customerservice2api.southerncompany.com/api/MyPowerUsage/DailyGraph', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8',
					Authorization: `bearer ${this.jwt}`,
				},
				body: JSON.stringify({
					accountNumber: account,
					StartDate: SouthernCompanyAPI.formatDate(correctedStartDate),
					EndDate: SouthernCompanyAPI.formatDate(endDate),
					DataType: 'Cost',
					OPCO: 'APC',
					intervalBehavior: 'Automatic'
				})
			});

			/* Returning array of requests */
			return [usageRequest, costRequest];
		});

		/* Promising everything! */
		const responses = await Promise.all(requests.map((accountPromises)=> Promise.all(accountPromises)));

		/* Parsing out responses and returning the usage data*/
		return await Promise.all(responses.map(async (accountResponses, index)=>{
			/* Parsing responses to JSON */
			const accountResData: DailyDataResponse[] = await Promise.all(accountResponses.map((res)=> res.json()));

			/* Parsing out graphsets from data */
			const graphData = accountResData.map((resData)=> JSON.parse(resData.Data.Data).graphset[0]);

			/* For both cost and usage, find both weekend and weekday series, concat them together */
			const rawUsageData = graphData.map((data)=>{
				let dataArray: API.GraphSetSeriesValue[] = [];
				let badIndexes: number[] = [];

				/* Make sure series are not empty (no data) */
				if(data.series != null){
					data.series.forEach((series: API.GraphDataSeries)=>{
						if(series.text === 'Regular Usage' || series.text === 'Weekend'){
							/* Pulling data out and recording data */
							dataArray = dataArray.concat(series.values);

							/* Checking for any bad indexes */
							if(series.rules){
								badIndexes.concat(series.rules
									.filter((rule)=> rule['tooltip-text'] === 'Delayed Reading')
									.map((rule)=>{
										const matches = (/%i == (\d+)/gi).exec(rule.rule);

										return (matches && matches[1])? matches[1] : 'none';
									})
									.filter((index)=> index !== 'none')
									.map((index)=> parseInt(index)));
							}
						}
					});
				}

				/* Sorting the data based on day number and filtering out bad indexes */
				const filteredData = dataArray
					.sort(this.dataSort)
					.map((data)=>{
						/* Copying object to change data to undefined if needed */
						const mappedData: UsageData = Object.assign(data);

						if(badIndexes.includes(data[0])){
							mappedData[1] = null;
						}

						return mappedData;
					});;

				/* Giving back completed arrays */
				return filteredData;
			});

			/* Creating Response array */
			const formattedUsageData: DailyData = {
				accountNumber: accounts[index],
				data: [],
			};
			for(let i = 0; i <= differenceInCalendarDays(endDate, startDate); i++){
				formattedUsageData.data.push({
					date: addDays(startDate, i),
					kWh: rawUsageData[0][i][1],
					cost: rawUsageData[1][i][1],
				})
			}

			/* Returning usage data */
			return formattedUsageData;
		}));
	}
	public async getMonthlyData(){
		/* Checking to make sure we have a JWT to use */
		if(!this.jwt){
			throw new Error('Could not get monthly data: Not Logged In');
		}

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
			const graphData = JSON.parse(response.Data.Data).graphset[0];

			/* Checking to make sure there is data */
			if(graphData['scale-x'] === undefined){
				return ({
					accountNumber: accounts[index],
					data: [],
				});
			}

			/* Checking to see if there is any optional data */
			const kWhData = graphData.series.find((series)=> series.text === 'Usage (kWh)');
			const costData = graphData.series.find((series)=> series.text === 'Service Amount (Cost $)');
			const billData = graphData.series.find((series)=> series.text === 'Budget Bill Amount');

			/* Mapping data to single array */
			const rawMonthData: MonthlyData[] = graphData['scale-x'].labels.map((date: string, index: number)=>{
				const dateString = date.split('/').map((num)=> parseInt(num));

				/* Monthly data object */
				const monthData: MonthlyData = {
					date: new Date(2000 + dateString[1], dateString[0] - 1),
				};

				/* Adding any available data */
				if(kWhData){
					monthData.kWh = kWhData.values[index];
				}
				if(costData){
					monthData.cost = costData.values[index];
				}
				if(billData){
					monthData.bill = billData.values[index];
				}

				/* Returning data */
				return monthData;
			});

			/* Filtering months with zero kWh */
			const data = rawMonthData.filter((data)=> data.kWh !== 0);

			/* Returning month data */
			const monthlyData: AccountMonthlyData = {
				accountNumber: accounts[index],
				data,
			};

			return monthlyData;
		});

		/* Returning monthly data */
		return monthlyData;
	}
}