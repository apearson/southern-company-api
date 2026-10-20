/* Libraries */
import {SouthernCompanyAPI} from '../src/main';

/* Config. `accounts` is the CI secret; without it this file does not describe a real filter. */
const accountList = process.env.accounts?.trim() ? JSON.parse(process.env.accounts) as string[] : undefined;
const config = {
	username: process.env.username as string,
	password: process.env.password as string,
	...(accountList ? { accounts: accountList } : {})
};

/* Connecting to API */
let API: SouthernCompanyAPI;

const describeLive = process.env.username && process.env.password && accountList?.length ? describe : describe.skip;

/* Setting up API */
beforeAll(() => {
	API = new SouthernCompanyAPI(config);
});

describeLive('live multiple accounts', ()=>{
jest.setTimeout(60000);

test('grabs list of monthly data', async ()=>{
	const data = await API.getMonthlyData();

	expect(data.length).toBe(accountList?.length);
	expect(data[0]).toHaveProperty('accountNumber');
	expect(data[0]).toHaveProperty('data');
	expect(data[0].data.length).toBeGreaterThan(0);
});
});