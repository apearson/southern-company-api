/* Libraries */
import SouthernCompanyAPI from '../src/main';
import {subDays} from 'date-fns';

/* Config */
const config = {
	username: process.env.username,
	password: process.env.password,
	accounts: JSON.parse(process.env.accounts)
};

/* Connecting to API */
let API: SouthernCompanyAPI;

/* Setting up API */
beforeAll(() => {
	return new Promise((resolve, reject)=> {
		API = new SouthernCompanyAPI(config);
		API.on('connected', resolve);
	});
});

test('grabs list of daily data', async ()=>{
	const endDate = subDays(new Date(), 1);
	const startDate = subDays(endDate, 3);

	const accounts = await API.getDailyData(startDate, endDate);

	if(!(accounts instanceof Array)){
		throw new Error('Returned a none array');
	}
	else if(accounts.length === 0){
		throw new Error('Returned an empty array');
	}
	else if(accounts.length !== config.accounts.length){
		throw new Error('Returned a larger than accounts array');
	}
	else{
		return;
	}
});
test('grabs list of monthly data', async ()=>{
	const accounts = await API.getMonthlyData();

	if(!(accounts instanceof Array)){
		throw new Error('Returned a none array');
	}
	else if(accounts.length === 0){
		throw new Error('Returned an empty array');
	}
	else if(accounts.length !== config.accounts.length){
		throw new Error('Returned a larger than accounts array');
	}
	else{
		return;
	}
});