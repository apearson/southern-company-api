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

const describeLive = process.env.username && process.env.password ? describe : describe.skip;

/* Tests */
describeLive('live account data', ()=>{
jest.setTimeout(60000);

test('grabs a list of accounts', async ()=>{
	const accounts = await API.getAccounts();

	expect(accounts).toHaveProperty('length');
	expect(accounts.length).toBeGreaterThan(0);
});
});