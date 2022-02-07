/* Libraries */
import {EventEmitter} from 'events';
import fetch from 'node-fetch';
import {differenceInCalendarDays, subDays, addDays, format} from 'date-fns';
import {stringify} from 'querystring';
import {URL, URLSearchParams} from 'url';
/* Interfaces */
import {
	Company,
	DailyData,
	AccountMonthlyData,
	MonthlyData,
	Account,
	UsageData,
	AllBills,
	HourlyData,
	AccountHourlyData
} from './interfaces/general';
import {
	GetAllAccountsResponse,
	LoginResponse,
	MonthlyDataResponse,
	DailyDataResponse,
	GetAllBillsResponse
} from './interfaces/responses';
import {API} from './interfaces/API';
import {getAccountsArray, getJwt, login, makeApiRequest} from './helper'

/* Interfaces */
export interface SouthernCompanyConfig {
	username: string;
	password: string;
	account?: string;
	accounts?: string[];
}

export class SouthernCompanyAPI extends EventEmitter {
	constructor() {
		super();
	}

	private static formatDateTime(date) {
		return format(date, "MM/dd/yyyy pp")
	}

	private static formatDate(date){
		return format(date, "MM/dd/yyyy")
	}

	private dataSort(a, b) {
		if (a[0] > b[0]) return 1;
		else if (a[0] < b[0]) return -1;
		else return 0;
	}


	/* Data methods */
	public async getDailyData(startDate: Date, endDate: Date) {
		/* Sanity checking arguments */
		if (endDate < startDate) {
			throw new Error('Invalid Dates');
		}

		/* Calulating which accounts to fetch data from */
		let accounts = getAccountsArray();

		/* Formatting dates for API */
		let correctedStartDate = subDays(startDate, 1);

		const jwt = await getJwt();

		/* Requests */
		const requests = accounts.map((account) => {
			/* Usage Request */
			const usageRequest = fetch('https://customerservice2api.southerncompany.com/api/MyPowerUsage/DailyGraph', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=UTF-8',
					Authorization: `bearer ${jwt}`,
				},
				body: JSON.stringify({
					accountNumber: account,
					StartDate: SouthernCompanyAPI.formatDateTime(correctedStartDate),
					EndDate: SouthernCompanyAPI.formatDateTime(endDate),
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
					Authorization: `bearer ${jwt}`,
				},
				body: JSON.stringify({
					accountNumber: account,
					StartDate: SouthernCompanyAPI.formatDateTime(correctedStartDate),
					EndDate: SouthernCompanyAPI.formatDateTime(endDate),
					DataType: 'Cost',
					OPCO: 'APC',
					intervalBehavior: 'Automatic'
				})
			});

			/* Returning array of requests */
			return [usageRequest, costRequest];
		});

		/* Promising everything! */
		const responses = await Promise.all(requests.map((accountPromises) => Promise.all(accountPromises)));

		/* Parsing out responses and returning the usage data*/
		return await Promise.all(responses.map(async (accountResponses, index) => {
			/* Parsing responses to JSON */
			const accountResData: DailyDataResponse[] = await Promise.all(accountResponses.map((res) => res.json()));

			/* Parsing out graphsets from data */
			const graphData = accountResData.map((resData) => JSON.parse(resData.Data.Data).graphset[0]);

			/* For both cost and usage, find both weekend and weekday series, concat them together */
			const rawUsageData = graphData.map((data) => {
				let dataArray: API.GraphSetSeriesValue[] = [];
				let badIndexes: number[] = [];

				/* Make sure series are not empty (no data) */
				if (data.series != null) {
					data.series.forEach((series: API.GraphDataSeries) => {
						if (series.text === 'Regular Usage' || series.text === 'Weekend') {
							/* Pulling data out and recording data */
							dataArray = dataArray.concat(series.values);

							/* Checking for any bad indexes */
							if (series.rules) {
								badIndexes.concat(series.rules
									.filter((rule) => rule['tooltip-text'] === 'Delayed Reading')
									.map((rule) => {
										const matches = (/%i == (\d+)/gi).exec(rule.rule);

										return (matches && matches[1]) ? matches[1] : 'none';
									})
									.filter((index) => index !== 'none')
									.map((index) => parseInt(index)));
							}
						}
					});
				}

				/* Sorting the data based on day number and filtering out bad indexes */
				const filteredData = dataArray
					.sort(this.dataSort)
					.map((data) => {
						/* Copying object to change data to undefined if needed */
						const mappedData: UsageData = Object.assign(data);

						if (badIndexes.includes(data[0])) {
							mappedData[1] = null;
						}

						return mappedData;
					});
				;

				/* Giving back completed arrays */
				return filteredData;
			});

			/* Creating Response array */
			const formattedUsageData: DailyData = {
				accountNumber: accounts[index],
				data: [],
			};
			for (let i = 0; i <= differenceInCalendarDays(endDate, startDate); i++) {
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

	public async getMonthlyData() {
		/* Calulating which accounts to fetch data from */
		let accounts = getAccountsArray();

		/* Creating a request for each account */
		const requests = accounts.map((account) => {
			return makeApiRequest(`https://customerservice2api.southerncompany.com/api/MyPowerUsage/MonthlyGraph/${account}`)
		});

		const resData: MonthlyDataResponse[] = await Promise.all(requests);

		/* Grabbing data from all responses */
		const monthlyData = resData.map((response, index) => {
			/* Parsing graph data */
			const graphData = JSON.parse(response.Data.Data).graphset[0];

			/* Checking to make sure there is data */
			if (graphData['scale-x'] === undefined) {
				return ({
					accountNumber: accounts[index],
					data: [],
				});
			}

			/* Checking to see if there is any optional data */
			const kWhData = graphData.series.find((series) => series.text === 'Usage (kWh)');
			const costData = graphData.series.find((series) => series.text === 'Service Amount (Cost $)');
			const billData = graphData.series.find((series) => series.text === 'Budget Bill Amount');

			/* Mapping data to single array */
			const rawMonthData: MonthlyData[] = graphData['scale-x'].labels.map((date: string, index: number) => {
				const dateString = date.split('/').map((num) => parseInt(num));

				/* Monthly data object */
				const monthData: MonthlyData = {
					date: new Date(2000 + dateString[1], dateString[0] - 1),
				};

				/* Adding any available data */
				if (kWhData) {
					monthData.kWh = kWhData.values[index];
				}
				if (costData) {
					monthData.cost = costData.values[index];
				}
				if (billData) {
					monthData.bill = billData.values[index];
				}

				/* Returning data */
				return monthData;
			});

			/* Filtering months with zero kWh */
			const data = rawMonthData.filter((data) => data.kWh !== 0);

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

	public async getHourlyData(startDate: Date, endDate: Date) {
		let accounts = getAccountsArray();

		const hourlyDataReponse = await Promise.all(accounts.map(account => this.buildHourlyDataResponse(account, startDate, endDate)))

		return hourlyDataReponse
	}

	private async buildHourlyDataResponse(account: string, startDate: Date, endDate: Date) {
		const servicePointNumber = await this.fetchServicePointNumber(account)
		const url = this.buildHourlyURL(startDate, endDate, account, servicePointNumber);

		const jsonResponse: API.hourlyMPUData = await makeApiRequest(url.toString())

		const graphData: API.hourlyMPUGraphData = JSON.parse(jsonResponse.Data.Data)

		let combinedGraphData

		if (graphData) {
			const {cost: {data: costData}, usage: {data: usageData}, temp: {data: tempData}} = graphData.series

			combinedGraphData = costData.reduce((acc, curr, index, array) => {
				acc.push({
					date: new Date(curr.name),
					cost: curr.y,
					kWh: usageData[index].y,
					tempF: tempData[index].y
				})
				return acc
			}, new Array())
		}

		const hourlyDataReponse: AccountHourlyData = {
			accountNumber: account,
			data: combinedGraphData
		}
		return hourlyDataReponse;
	}

	private buildHourlyURL(startDate: Date, endDate: Date, accountNumber: string, servicePointNumber: string) {

		const url = new URL(`https://customerservice2api.southerncompany.com/api/MyPowerUsage/MPUData/${accountNumber}/Hourly`)

		url.search = new URLSearchParams({
			StartDate: SouthernCompanyAPI.formatDate(startDate),
			EndDate: SouthernCompanyAPI.formatDate(endDate),
			ServicePointNumber: servicePointNumber,
			OPCO: 'GPC',
			intervalBehavior: 'Automatic'
		}).toString()

		return url;
	}

	/* Get All Bills methods */
	public async getAllBillsData() {
		const url = 'https://customerservice2api.southerncompany.com/api/Billing/getAllBills';
		const allbills: GetAllBillsResponse = await makeApiRequest(url);
		return allbills;
	}

	private async fetchServicePointNumber(accountNumber: string): Promise<string> {
		const url = `https://customerservice2api.southerncompany.com/api/MyPowerUsage/getMPUBasicAccountInformation/${accountNumber}/GPC`;
		const json: API.getMPUBasicAccountInformationResponse = await makeApiRequest(url)
		return json.Data.meterAndServicePoints[0].servicePointNumber
	}
}