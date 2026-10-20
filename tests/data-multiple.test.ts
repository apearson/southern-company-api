/* Libraries */
import {SouthernCompanyAPI} from '../src/main';

/* Config */
const config = {
	username: process.env.username as string,
	password: process.env.password as string,
	accounts: process.env.accounts ? JSON.parse(process.env.accounts) as string[] : []
};

/* Connecting to API */
let API: SouthernCompanyAPI;

const describeLive = process.env.username && process.env.password ? describe : describe.skip;

/* Setting up API */
beforeAll(() => {
	API = new SouthernCompanyAPI(config);
});

describeLive('live multiple accounts', ()=>{
test('grabs list of monthly data', async ()=>{
	const data = await API.getMonthlyData();

	expect(data.length).toBe(config.accounts.length);
	expect(data[0]).toHaveProperty('accountNumber');
	expect(data[0]).toHaveProperty('data');
	expect(data[0].data.length).toBeGreaterThan(0);
});
});