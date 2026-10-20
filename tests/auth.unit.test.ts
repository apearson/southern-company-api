import { CookieJar, extractJwt, fillCallbacks, loginCompany, parseHiddenForm } from '../src/auth';
import { sanitize } from '../src/debug';
import { accountFiltersFromConfig, accountsFromResponses, buildUsageUrl, indexServicePoints, readUsageGraph } from '../src/usage';

function headers(values: Record<string, string | string[]>) {
	return {
		get(name: string){
			const raw = values[name] ?? values[name.toLowerCase()];
			if(Array.isArray(raw)){
				return raw.join(', ');
			}
			return raw ?? null;
		},
		raw(){
			const cookies = values['set-cookie'] || values['Set-Cookie'];
			return { 'set-cookie': Array.isArray(cookies) ? cookies : cookies ? [cookies] : [] };
		}
	};
}

test('login company falls back to SCS', ()=>{
	expect(loginCompany(undefined)).toBe('SCS');
	expect(loginCompany('apc')).toBe('APC');
	expect(loginCompany('nope')).toBe('SCS');
});

test('cookie jar sends host-only and parent-domain cookies to the matching host', ()=>{
	const jar = new CookieJar();
	jar.absorb('https://webauth.southernco.com/SPA/OCC/login', headers({
		'set-cookie': [
			'.AspNetCore.Correlation.abc=nonce; path=/; secure; httponly',
			'visid_incap_1=bot; path=/; Domain=.southernco.com; Secure'
		]
	}));
	jar.setHostCookie('customerlogin.southernco.com', 'sso', 'session');

	const webauth = jar.headerFor('https://webauth.southernco.com/SPA/signin-forgerock-oidc-authcode');
	expect(webauth).toContain('.AspNetCore.Correlation.abc=nonce');
	expect(webauth).toContain('visid_incap_1=bot');
	expect(webauth).not.toContain('sso=');

	const login = jar.headerFor('https://customerlogin.southernco.com/am/oauth2/authorize');
	expect(login).toContain('sso=session');
	expect(login).toContain('visid_incap_1=bot');
	expect(login).not.toContain('Correlation');
});

test('cookie jar drops cookies cleared with Max-Age=0', ()=>{
	const jar = new CookieJar();
	jar.absorb('https://customerlogin.southernco.com/am/json/authenticate', headers({
		'set-cookie': 'amlbcookie=01; path=/; HttpOnly'
	}));
	jar.absorb('https://customerlogin.southernco.com/am/json/authenticate', headers({
		'set-cookie': 'amlbcookie=; path=/; Max-Age=0'
	}));
	expect(jar.headerFor('https://customerlogin.southernco.com/am/json/authenticate')).not.toContain('amlbcookie');
});

test('jwt is read from the response header before set-cookie', ()=>{
	const fromHeader = extractJwt(headers({ ScJwtToken: 'aaa.bbb.ccc', 'set-cookie': 'dtCookie=v; Path=/' }));
	expect(fromHeader).toBe('aaa.bbb.ccc');

	const fromCookie = extractJwt(headers({ 'set-cookie': ['dtCookie=v; Path=/', 'ScJwtToken=ddd.eee.fff; Path=/; Secure'] }));
	expect(fromCookie).toBe('ddd.eee.fff');

	expect(extractJwt(headers({ 'set-cookie': 'visid_incap=1; Path=/' }))).toBeUndefined();
});

test('hidden form parser ignores the password login form', ()=>{
	const html = `
		<form action="/login"><input type="password" name="password" value=""></form>
		<form method="post" action="/SPA/signin-forgerock-oidc-authcode">
			<input type="hidden" name="code" value="auth-code">
			<input type="hidden" name="state" value="state&amp;value">
		</form>`;
	expect(parseHiddenForm(html)).toEqual({
		action: '/SPA/signin-forgerock-oidc-authcode',
		fields: { code: 'auth-code', state: 'state&value' }
	});
});

test('ForgeRock callbacks submit Log In rather than the default Cancel option', ()=>{
	const callbacks = fillCallbacks([
		{ type: 'NameCallback', output: [{ name: 'prompt', value: 'User Name' }], input: [{ name: 'IDToken1', value: '' }] },
		{ type: 'PasswordCallback', output: [{ name: 'prompt', value: 'Password' }], input: [{ name: 'IDToken2', value: '' }] },
		{ type: 'TextOutputCallback', output: [{ name: 'message', value: '<html></html>' }] },
		{
			type: 'ConfirmationCallback',
			output: [{ name: 'options', value: ['Log In', 'Cancel'] }, { name: 'defaultOption', value: 1 }],
			input: [{ name: 'IDToken4', value: 1 }]
		}
	], 'user', 'secret');

	expect(callbacks[0].input?.[0].value).toBe('user');
	expect(callbacks[1].input?.[0].value).toBe('secret');
	expect(callbacks[3].input?.[0].value).toBe(0);
});

test('ForgeRock stops when a callback asks for a one-time code', ()=>{
	expect(()=> fillCallbacks([
		{ type: 'NameCallback', output: [{ name: 'prompt', value: 'One Time Password' }], input: [{ name: 'IDToken1', value: '' }] }
	], 'user', 'secret')).toThrow(/additional authentication step/);
});

test('account and usage responses map to the public account shape', ()=>{
	const cap = { data: [{ accountNumber: '0001234567', description: 'Home', isPrimaryAccount: true }] };
	const summary = {
		data: {
			accountId: '0001234567',
			divisionCode: 'APC',
			customerName: 'Home',
			mainPersonId: 'person-1',
			serviceAgreements: [
				{
					serviceAgreementId: 'sa-light',
					serviceTypeCode: 'E',
					serviceSubTypeCode: 'L',
					statusCode: 'Active',
					premiseId: 'prem-l',
					servicePoints: [{ servicePointId: 'sp-l', meterNumber: 'm-l' }]
				},
				{
					serviceAgreementId: 'sa-1',
					serviceTypeCode: 'E',
					serviceSubTypeCode: 'E',
					statusCode: 'Active',
					premiseId: 'prem-1',
					servicePoints: [{ servicePointId: 'sp-1', meterNumber: 'm-1' }]
				},
				{
					serviceAgreementId: 'sa-closed',
					serviceTypeCode: 'E',
					serviceSubTypeCode: 'E',
					statusCode: 'Closed',
					premiseId: 'prem-x',
					servicePoints: [{ servicePointId: 'sp-x' }]
				}
			]
		}
	};

	const { accounts, targets } = accountsFromResponses(cap, [summary]);
	expect(accounts).toHaveLength(1);
	expect(accounts[0]).toMatchObject({
		name: 'Home',
		primary: 'Y',
		number: 1234567,
		company: 'APC'
	});
	expect(accounts[0].servicePoints.map((point)=> point.servicePointNumber)).toEqual(['sp-1', 'sp-l']);
	expect(targets[0]).toMatchObject({
		serviceAgreementId: 'sa-1',
		servicePointId: 'sp-1',
		premiseId: 'prem-1',
		company: 'APC',
		personId: 'person-1'
	});

	const url = new URL(buildUsageUrl('Daily', targets[0], { startDate: '10/01/2026', endDate: '10/08/2026' }));
	expect(url.pathname).toBe('/api/v1/MyPowerUsage/UsageGraphData/sa-1/Daily');
	expect(url.searchParams.get('operatingCompany')).toBe('APC');
	expect(url.searchParams.get('endDate')).toBe('10/08/2026');
	expect(url.searchParams.get('servicePointId')).toBe('sp-1');
});

test('an empty account list does not filter, and service-point ids stay attached to the summary that issued them', ()=>{
	expect(accountFiltersFromConfig({ accounts: [] })).toEqual([]);
	expect(accountFiltersFromConfig({ accounts: [' 100 '], account: '200' })).toEqual(['100', '200']);

	const first = indexServicePoints([{
		accountNumber: 1,
		accountId: '0000000001',
		company: 'APC',
		name: 'Home',
		primary: 'Y',
		servicePointNumber: 'issued-with-summary-a',
		meterNumber: 'meter-1',
		servicePointId: 'issued-with-summary-a',
		serviceAgreementId: 'sa-1',
		premiseId: 'prem-1'
	}]);
	expect(first.get('issued-with-summary-a')?.serviceAgreementId).toBe('sa-1');
	expect(first.get('meter-1')?.serviceAgreementId).toBe('sa-1');
	expect(first.has('issued-with-summary-b')).toBe(false);
});

test('debug keeps cookie names and hides cookie values', ()=>{
	expect(sanitize({
		ssoCookieName: 'c4928758b74fd64',
		setCookieNames: ['ScJwtToken', 'dtCookie'],
		cookie: 'ScJwtToken=aaa.bbb.ccc',
		password: 'secret',
		authorization: 'Bearer aaa.bbb.ccc'
	})).toEqual({
		ssoCookieName: 'c4928758b74fd64',
		setCookieNames: ['ScJwtToken', 'dtCookie'],
		cookie: '[redacted]',
		password: '[redacted]',
		authorization: '[redacted]'
	});
});

test('usage graph reader accepts the new envelope and the old JSON string', ()=>{
	const graph = { series: { usage: { data: [{ y: 1 }] } } };
	expect(readUsageGraph({ data: { data: graph } })).toEqual(graph);
	expect(readUsageGraph({ Data: { Data: JSON.stringify(graph), HasData: true } })).toEqual(graph);
	expect(readUsageGraph({ data: { data: null, hasData: false } })).toBeNull();
});
