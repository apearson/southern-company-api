/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';

/* Config */
const config: SouthernCompanyConfig = {
	username: process.env.username as string,
	password: process.env.password as string,
	account: process.env.account as string,
	company: process.env.company as string,
};

/* Connecting to API */
let API: SouthernCompanyAPI;

/* Setting up API */
beforeAll(() => {
	API = new SouthernCompanyAPI(config);
});

test('grabs list of monthly data', async ()=>{
	const data = await API.getMonthlyData();

	expect(data.length).toBeGreaterThan(0);
	expect(data[0]).toHaveProperty('accountNumber');
	expect(data[0]).toHaveProperty('data');
	expect(data[0].data.length).toBeGreaterThan(0);
});
