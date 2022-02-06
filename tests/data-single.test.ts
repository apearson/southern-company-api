/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';
import {subDays} from 'date-fns';

/* Config */
const config: SouthernCompanyConfig = {
	username: process.env.username as string,
	password: process.env.password as string,
	account: process.env.account as string
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

// test('grabs list of daily data', async ()=>{
// 	const endDate = subDays(new Date(), 1);
// 	const startDate = subDays(endDate, 3);

// 	const data = await API.getDailyData(startDate, endDate);

// 	if(!(data instanceof Array)){
// 		throw new Error('Returned a none array');
// 	}
// 	else if(data.length === 0){
// 		throw new Error('Returned an empty array');
// 	}
// 	else if(data.length !== 1){
// 		throw new Error('Returned a larger than one array');
// 	}
// 	else{
// 		return;
// 	}
// });
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

test('grab list of hourly data' , async () => {

	const result = await API.getHourlyData(new Date("02/02/2022"), new Date("02/03/2022"))
})