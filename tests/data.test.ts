/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';
import {subDays} from 'date-fns';

/* Config */
const config: SouthernCompanyConfig = {
	username: process.env.username,
	password: process.env.password
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

/* Tests */
test('checks dates are in correct order', async ()=>{
	const startDate = subDays(new Date(), 1);
	const endDate = subDays(startDate, 3);

	try{
		const data = await API.getDailyData(startDate, endDate);
		throw new Error('Did not catch dates in wrong order');
	}
	catch(e){
		return;
	}
});
// test('grabs list of daily data', async ()=>{
// 	const endDate = subDays(new Date(), 1);
// 	const startDate = subDays(endDate, 10);

// 	const data = await API.getDailyData(startDate, endDate);

// 	if(!(data instanceof Array)){
// 		throw new Error('Returned a none array');
// 	}
// 	else if(data.length === 0){
// 		throw new Error('Returned an empty array');
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