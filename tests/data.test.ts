/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';

/* Config */
const config: SouthernCompanyConfig = {
	username: process.env.username as string,
	password: process.env.password as string
};

/* Connecting to API */
let API: SouthernCompanyAPI;

/* Setting up API */
beforeAll(() => {
	API = new SouthernCompanyAPI(config);
});

/* Tests */
test('grabs list of monthly data', async ()=>{
	const data = await API.getMonthlyData();

	expect(data.length).toBeGreaterThan(0);
	expect(data[0]).toHaveProperty('accountNumber');
	expect(data[0]).toHaveProperty('data');
	expect(data[0].data.length).toBeGreaterThan(0);
});

test('grabs list of daily data', async ()=>{
	const accounts = await API.getAccounts();
	const servicePointNumber = accounts[0].servicePoints[0].servicePointNumber;

	const endDate = new Date();
	endDate.setDate(endDate.getDate() - 1);
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 8);

	const returnedData = await API.getDailyData(startDate, endDate, servicePointNumber);

	expect(returnedData).toHaveProperty('accountNumber');
	expect(returnedData).toHaveProperty('data');
	expect(returnedData.data.length).toBe(8);
});

test('grabs list of hourly data', async ()=>{
	const accounts = await API.getAccounts();
	const servicePointNumber = accounts[0].servicePoints[0].servicePointNumber;

	const endDate = new Date();
	endDate.setDate(endDate.getDate() - 1);
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 2);

	const returnedData = await API.getHourlyData(startDate, endDate, servicePointNumber);

	expect(returnedData).toHaveProperty('accountNumber');
	expect(returnedData).toHaveProperty('hasData');
	expect(returnedData).toHaveProperty('data');
	expect(returnedData.data.length).toBe(48);
	expect(returnedData.data[0]).toHaveProperty('date');
	expect(returnedData.data[0]).toHaveProperty('kWh');
	expect(returnedData.data[0]).toHaveProperty('cost');
	expect(returnedData.data[0]).toHaveProperty('temp');
});

test('hourly data with startDate == endDate returns a single day', async ()=>{
	const accounts = await API.getAccounts();
	const servicePointNumber = accounts[0].servicePoints[0].servicePointNumber;

	const date = new Date();
	date.setDate(date.getDate() - 1);

	const returnedData = await API.getHourlyData(date, date, servicePointNumber);

	expect(returnedData).toHaveProperty('hasData');
	if(returnedData.hasData){
		expect(returnedData.data.length).toBe(24);
	}
});
