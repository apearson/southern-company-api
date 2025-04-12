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

	if(!(data instanceof Array)){
		throw new Error('Returned a none array');
	}
	else if(data.length === 0){
		throw new Error('Returned an empty array');
	}
	else{
		return;
	}
});

test('grabs list of daily data', async ()=>{
	const accounts = await API.getAccounts();
	const servicePointNumber = accounts[0].servicePoints[0].servicePointNumber;

	const endDate = new Date();
	endDate.setDate(endDate.getDate() - 1);
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 8);
	const data = await API.getDailyData(startDate, endDate, servicePointNumber);

	if(!(data instanceof Array)){
		throw new Error('Returned a none array');
	}
	else if(data.length === 0){
		throw new Error('Returned an empty array');
	}
	else if(data.length !== 7){
		throw new Error('Returned an array of incorrect length');
	}
	else{
		return;
	}
});
