import fetch, { RequestRedirect, Response } from 'node-fetch';
import { DebugLogger, createDebugLogger, redactSecrets, safeUrl } from './debug';

export interface SouthernCompanyLogin {
	username: string;
	password: string;
	company?: string;
}

export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const LOGIN_COMPANY = new Set(['SCS', 'APC', 'GPC', 'MPC', 'GULF']);
const FORGEROCK_AUTH = 'https://customerlogin.southernco.com/am/json/realms/root/realms/alpha/authenticate?authIndexType=service&authIndexValue=occSecureLogin';
const SERVER_INFO = 'https://customerlogin.southernco.com/am/json/realms/root/realms/alpha/serverinfo/*';
const JWT_URL = 'https://customerservice2.southerncompany.com/Account/LoginValidated/JwtToken';
const FALLBACK_SSO_COOKIE = 'c4928758b74fd64';

const FORGEROCK_HEADERS = {
	Accept: 'application/json',
	'Content-Type': 'application/json',
	'Accept-API-Version': 'resource=2.1, protocol=1.0',
	Origin: 'https://customerlogin.southernco.com',
	Referer: 'https://customerlogin.southernco.com/am/XUI/'
};

interface HeaderBag {
	get(name: string): string | null;
	raw?: () => { [key: string]: string[] };
}

interface StoredCookie {
	name: string;
	value: string;
	domain: string;
	hostOnly: boolean;
	path: string;
}

export class CookieJar {
	private cookies: StoredCookie[] = [];

	absorb(requestUrl: string, headers: HeaderBag): void {
		const hostname = new URL(requestUrl).hostname;
		for(const header of setCookieHeaders(headers)){
			this.store(hostname, header);
		}
	}

	headerFor(requestUrl: string): string {
		const url = new URL(requestUrl);
		const matches = this.cookies.filter((cookie)=> cookieMatches(cookie, url));
		return matches.map((cookie)=> `${cookie.name}=${cookie.value}`).join('; ');
	}

	setHostCookie(hostname: string, name: string, value: string): void {
		this.replace({
			name,
			value,
			domain: hostname.toLowerCase(),
			hostOnly: true,
			path: '/'
		});
	}

	private store(hostname: string, header: string): void {
		const [pair, ...attrs] = header.split(';');
		const eq = pair.indexOf('=');
		if(eq <= 0){
			return;
		}

		const name = pair.slice(0, eq).trim();
		const value = pair.slice(eq + 1).trim();
		let domain = hostname.toLowerCase();
		let hostOnly = true;
		let path = '/';
		let remove = value.length === 0;

		for(const attr of attrs){
			const [rawKey, ...rest] = attr.split('=');
			const key = rawKey.trim().toLowerCase();
			const attrValue = rest.join('=').trim();
			if(key === 'domain' && attrValue){
				domain = attrValue.replace(/^\./, '').toLowerCase();
				hostOnly = false;
			}
			else if(key === 'path' && attrValue){
				path = attrValue;
			}
			else if(key === 'max-age' && attrValue === '0'){
				remove = true;
			}
		}

		if(remove){
			this.cookies = this.cookies.filter((cookie)=> !(cookie.name === name && cookie.domain === domain && cookie.hostOnly === hostOnly));
			return;
		}

		this.replace({ name, value, domain, hostOnly, path });
	}

	private replace(cookie: StoredCookie): void {
		this.cookies = this.cookies.filter((existing)=> !(existing.name === cookie.name && existing.domain === cookie.domain && existing.hostOnly === cookie.hostOnly));
		this.cookies.push(cookie);
	}
}

export function loginCompany(company?: string): string {
	const code = (company || 'SCS').toUpperCase();
	return LOGIN_COMPANY.has(code) ? code : 'SCS';
}

export function extractJwt(headers: HeaderBag): string | undefined {
	for(const name of ['ScJwtToken', 'ScAccountsJwtToken']){
		const header = headers.get(name);
		if(header && header.includes('.')){
			return header;
		}
	}

	for(const cookie of setCookieHeaders(headers)){
		const match = /(?:^|,\s*)ScJwtToken=([^;]+)/i.exec(cookie) || /(?:^|,\s*)ScAccountsJwtToken=([^;]+)/i.exec(cookie);
		if(match?.[1]){
			return match[1];
		}
	}

	return undefined;
}

export function cookieNames(headers: HeaderBag): string[] {
	return setCookieHeaders(headers).map((cookie)=> cookie.split('=', 1)[0]);
}

export function parseHiddenForm(html: string): { action: string; fields: Record<string, string> } | undefined {
	const formRe = /<form\b[^>]*>[\s\S]*?<\/form>/gi;
	let formMatch: RegExpExecArray | null;
	while((formMatch = formRe.exec(html))){
		const form = formMatch[0];
		if(/type\s*=\s*["']password["']/i.test(form)){
			continue;
		}

		const action = decodeHtml(/action\s*=\s*["']([^"']*)["']/i.exec(form)?.[1] ?? '');
		const fields: Record<string, string> = {};
		const inputRe = /<input\b[^>]*>/gi;
		let inputMatch: RegExpExecArray | null;
		while((inputMatch = inputRe.exec(form))){
			const tag = inputMatch[0];
			const name = /name\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
			if(!name){
				continue;
			}
			const type = (/type\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? 'hidden').toLowerCase();
			if(type !== 'hidden' && type !== 'submit'){
				continue;
			}
			fields[name] = decodeHtml(/value\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '');
		}

		if(fields.code || fields.state || fields.ScWebToken || fields.Token || fields.id_token){
			return { action, fields };
		}
	}

	return undefined;
}

export function fillCallbacks(callbacks: ForgeRockCallback[], username: string, password: string): ForgeRockCallback[] {
	for(const callback of callbacks){
		const prompt = callbackPrompt(callback);
		switch(callback.type){
			case 'NameCallback':
				if(/passcode|otp|one[- ]time|verification code|mfa/i.test(prompt)){
					throw new Error(`Login failed: additional authentication step required (${callback.type}: ${prompt})`);
				}
				setCallbackInput(callback, username);
				break;
			case 'PasswordCallback':
				if(prompt && !/pass/i.test(prompt)){
					throw new Error(`Login failed: additional authentication step required (${callback.type}: ${prompt})`);
				}
				setCallbackInput(callback, password);
				break;
			case 'ConfirmationCallback':
				setCallbackInput(callback, confirmationChoice(callback));
				break;
			case 'TextOutputCallback':
			case 'MetadataCallback':
			case 'HiddenValueCallback':
				break;
			case 'DeviceProfileCallback':
				setCallbackInput(callback, deviceProfile());
				break;
			case 'BooleanAttributeInputCallback':
				setCallbackInput(callback, true);
				break;
			default:
				if(callback.input?.length){
					const options = callbackOptions(callback);
					const detail = prompt || options.join(', ');
					throw new Error(`Login failed: unsupported ForgeRock step ${callback.type}${detail ? ` (${detail})` : ''}`);
				}
		}
	}

	return callbacks;
}

interface ForgeRockCallback {
	type: string;
	output?: { name: string; value: unknown }[];
	input?: { name: string; value: unknown }[];
}

export async function authenticateSouthernCompany(config: SouthernCompanyLogin, debug: DebugLogger = createDebugLogger(false)): Promise<string> {
	const jar = new CookieJar();
	const company = loginCompany(config.company);
	const startUrl = 'https://customerservice2.southerncompany.com/Account/Login'
		+ `?returnUrl=${encodeURIComponent('/Billing/Home')}`
		+ `&cancelUrl=${encodeURIComponent('/Home')}`
		+ `&company=${encodeURIComponent(company)}`
		+ '&appId=pr-occ-forgerock';

	debug.log('auth.start', { company, path: safeUrl(startUrl) });
	const authorizeUrl = await followToAuthorize(jar, startUrl, debug);
	if(!authorizeUrl){
		throw new Error('Login failed: the portal did not redirect to the ForgeRock authorize endpoint');
	}

	const cookieName = await fetchSsoCookieName(jar, debug);
	const tokenId = await forgeRockLogin(jar, config.username, config.password, debug);
	jar.setHostCookie('customerlogin.southernco.com', cookieName, tokenId);
	debug.log('auth.sso', { cookieNameKnown: true });

	const authorizeResponse = await request(jar, authorizeUrl, { method: 'GET' }, debug, 'auth.authorize');
	return completePortalSession(jar, authorizeUrl, authorizeResponse, debug);
}

function setCookieHeaders(headers: HeaderBag): string[] {
	const raw = headers.raw?.();
	const fromRaw = raw?.['set-cookie'] || raw?.['Set-Cookie'];
	if(fromRaw?.length){
		return fromRaw;
	}

	const single = headers.get('set-cookie');
	return single ? [single] : [];
}

function cookieMatches(cookie: StoredCookie, url: URL): boolean {
	const host = url.hostname.toLowerCase();
	const domainOk = cookie.hostOnly ? host === cookie.domain : (host === cookie.domain || host.endsWith(`.${cookie.domain}`));
	const path = url.pathname || '/';
	const pathOk = path === cookie.path || path.startsWith(cookie.path.endsWith('/') ? cookie.path : `${cookie.path}/`) || cookie.path === '/';
	return domainOk && pathOk;
}

function callbackPrompt(callback: ForgeRockCallback): string {
	const output = callback.output?.find((entry)=> entry.name === 'prompt' || entry.name === 'message');
	return typeof output?.value === 'string' ? output.value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function callbackOptions(callback: ForgeRockCallback): string[] {
	const output = callback.output?.find((entry)=> entry.name === 'options');
	return Array.isArray(output?.value) ? output.value.map((option)=> String(option)) : [];
}

function confirmationChoice(callback: ForgeRockCallback): number {
	const options = callbackOptions(callback);
	const preferred = options.findIndex((option)=> /log\s*in|login|submit|continue|next/i.test(option));
	return preferred >= 0 ? preferred : 0;
}

function setCallbackInput(callback: ForgeRockCallback, value: unknown): void {
	if(!callback.input?.length){
		callback.input = [{ name: 'IDToken1', value }];
		return;
	}
	callback.input[0].value = value;
}

function deviceProfile(): string {
	return JSON.stringify({
		identifier: 'southern-company-api',
		metadata: {
			platform: { platform: 'Win32', userAgent: USER_AGENT, language: 'en-US' },
			browser: { userAgent: USER_AGENT, appName: 'Netscape', language: 'en-US' },
			hardware: { cpuClass: null, deviceMemory: 8, hardwareConcurrency: 8, maxTouchPoints: 0 }
		}
	});
}

function decodeHtml(value: string): string {
	return value
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

async function request(jar: CookieJar, url: string, init: { method?: string; headers?: Record<string, string>; body?: string }, debug: DebugLogger, step: string): Promise<Response> {
	const headers: Record<string, string> = {
		'User-Agent': USER_AGENT,
		Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
		...init.headers
	};
	const cookie = jar.headerFor(url);
	if(cookie){
		headers.Cookie = cookie;
	}

	const response = await fetch(url, {
		method: init.method || 'GET',
		headers,
		body: init.body,
		redirect: 'manual' as RequestRedirect
	});
	jar.absorb(url, response.headers);
	debug.log(step, {
		method: init.method || 'GET',
		status: response.status,
		path: safeUrl(url),
		redirect: response.headers.get('location') ? safeUrl(new URL(response.headers.get('location') as string, url).toString()) : undefined
	});
	return response;
}

async function followToAuthorize(jar: CookieJar, startUrl: string, debug: DebugLogger): Promise<string | undefined> {
	let url = startUrl;
	let authorizeUrl: string | undefined;

	for(let hop = 0; hop < 12; hop++){
		const response = await request(jar, url, { method: 'GET' }, debug, 'auth.redirect');
		const location = response.headers.get('location');
		if(response.status >= 300 && response.status < 400 && location){
			const next = new URL(location, url).toString();
			if(new URL(next).pathname.includes('/oauth2/authorize')){
				authorizeUrl = next;
			}
			url = next;
			continue;
		}

		debug.log('auth.redirect.done', { hop, status: response.status, path: safeUrl(url), authorize: Boolean(authorizeUrl) });
		break;
	}

	return authorizeUrl;
}

async function fetchSsoCookieName(jar: CookieJar, debug: DebugLogger): Promise<string> {
	try {
		const response = await request(jar, SERVER_INFO, {
			method: 'GET',
			headers: { Accept: 'application/json', 'Accept-API-Version': 'resource=1.1' }
		}, debug, 'auth.serverinfo');
		if(response.status === 200){
			const body = await response.json() as { cookieName?: string };
			if(body.cookieName){
				debug.log('auth.serverinfo', { cookieNameFound: true });
				return body.cookieName;
			}
		}
	}
	catch {
		debug.log('auth.serverinfo', { cookieNameFound: false });
	}

	return FALLBACK_SSO_COOKIE;
}

async function forgeRockLogin(jar: CookieJar, username: string, password: string, debug: DebugLogger): Promise<string> {
	let response = await request(jar, FORGEROCK_AUTH, {
		method: 'POST',
		headers: FORGEROCK_HEADERS,
		body: '{}'
	}, debug, 'auth.forgerock');

	for(let round = 0; round < 6; round++){
		const payload = await readJson(response);
		if(typeof payload.tokenId === 'string' && payload.tokenId){
			debug.log('auth.forgerock.success', { round });
			return payload.tokenId;
		}

		if(response.status === 401 || payload.code === 401){
			throw new Error(`Login failed: ${redactSecrets(String(payload.message || 'unauthorized'))}`);
		}

		const callbacks = payload.callbacks as ForgeRockCallback[] | undefined;
		if(!callbacks?.length || typeof payload.authId !== 'string'){
			throw new Error(`Login failed: unexpected ForgeRock response (status ${response.status})`);
		}

		for(const callback of callbacks){
			if(callback.type !== 'TextOutputCallback'){
				continue;
			}
			const message = callbackPrompt(callback);
			if(/invalid|incorrect|failed|locked|not recognized/i.test(message)){
				throw new Error(`Login failed: ${redactSecrets(message)}`);
			}
		}

		debug.log('auth.forgerock.callbacks', { round, types: callbacks.map((callback)=> callback.type) });
		fillCallbacks(callbacks, username, password);
		response = await request(jar, FORGEROCK_AUTH, {
			method: 'POST',
			headers: FORGEROCK_HEADERS,
			body: JSON.stringify({ authId: payload.authId, callbacks })
		}, debug, 'auth.forgerock.submit');
	}

	throw new Error('Login failed: ForgeRock authentication did not finish');
}

async function completePortalSession(jar: CookieJar, currentUrl: string, response: Response, debug: DebugLogger): Promise<string> {
	let url = currentUrl;
	let current = response;

	for(let hop = 0; hop < 12; hop++){
		const jwt = extractJwt(current.headers);
		if(jwt){
			debug.log('auth.jwt', { source: 'response', hop, path: safeUrl(url) });
			return jwt;
		}

		const location = current.headers.get('location');
		if(current.status >= 300 && current.status < 400 && location){
			url = new URL(location, url).toString();
			current = await request(jar, url, { method: 'GET' }, debug, 'auth.follow');
			continue;
		}

		if(current.status === 200){
			const html = await current.text();
			const form = parseHiddenForm(html);
			if(form){
				const action = new URL(form.action || url, url).toString();
				debug.log('auth.form', { path: safeUrl(action), fields: Object.keys(form.fields) });
				current = await request(jar, action, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Referer: url,
						Origin: new URL(url).origin
					},
					body: new URLSearchParams(form.fields).toString()
				}, debug, 'auth.form.submit');
				url = action;
				continue;
			}
		}

		debug.log('auth.follow.stop', { hop, status: current.status, path: safeUrl(url) });
		break;
	}

	debug.log('auth.jwtEndpoint', { path: safeUrl(JWT_URL) });
	const jwtResponse = await request(jar, JWT_URL, {
		method: 'GET',
		headers: {
			Accept: 'application/json, text/html',
			Referer: 'https://customerservice2.southerncompany.com/Billing/Home'
		}
	}, debug, 'auth.jwtEndpoint');
	const jwt = extractJwt(jwtResponse.headers);
	if(jwt){
		debug.log('auth.jwt', { source: 'jwt-endpoint', status: jwtResponse.status });
		return jwt;
	}

	const location = jwtResponse.headers.get('location');
	const redirect = location ? safeUrl(new URL(location, JWT_URL).toString()) : undefined;
	debug.log('auth.jwt.missing', { status: jwtResponse.status, redirect, setCookieNames: cookieNames(jwtResponse.headers) });
	if(jwtResponse.status >= 300 && jwtResponse.status < 400){
		throw new Error(`Login failed: JwtToken redirected (${jwtResponse.status}${redirect ? ` to ${redirect}` : ''}) and did not return ScJwtToken`);
	}

	throw new Error(`Login failed: JwtToken returned status ${jwtResponse.status} without an ScJwtToken header or cookie`);
}

async function readJson(response: Response): Promise<any> {
	const text = await response.text();
	try {
		return JSON.parse(text);
	}
	catch {
		throw new Error(`Login failed: expected JSON (status ${response.status}) ${redactSecrets(text)}`);
	}
}
