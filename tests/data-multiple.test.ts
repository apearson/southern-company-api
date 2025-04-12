/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';
import {subDays} from 'date-fns';

/* Config */
const config = {
	username: process.env.username as string,
	password: process.env.password as string,
	accounts: JSON.parse(process.env.accounts as string) as string[]
};

/* Connecting to API */
let API: SouthernCompanyAPI;

/* Setting up API */
beforeAll(() => {
	API = new SouthernCompanyAPI(config);
});

test('grabs list of monthly data', async ()=>{
	const data = await API.getMonthlyData();

	expect(data.length).toBe(config.accounts.length);
	expect(data[0]).toHaveProperty('accountNumber');
	expect(data[0]).toHaveProperty('data');
	expect(data[0].data.length).toBeGreaterThan(0);
});