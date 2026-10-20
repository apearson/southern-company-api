import http from 'http';
import zlib from 'zlib';
import { AddressInfo } from 'net';
import { isTruncatedBodyError, southernFetch } from '../src/http';

async function listen(handler: http.RequestListener): Promise<{ url: string; close: ()=> Promise<void> }> {
	const server = http.createServer(handler);
	await new Promise<void>((resolve)=> server.listen(0, '127.0.0.1', resolve));
	const address = server.address() as AddressInfo;
	return {
		url: `http://127.0.0.1:${address.port}/body`,
		close: ()=> new Promise((resolve)=> server.close(()=> resolve()))
	};
}

test('truncated body errors are recognized from the node-fetch message', ()=>{
	const error = new Error('Invalid response body while trying to fetch https://customerlogin.southernco.com/am/json/authenticate: Premature close');
	expect(isTruncatedBodyError(error)).toBe(true);
	expect(isTruncatedBodyError(new Error('Login failed: unauthorized'))).toBe(false);
});

test('requests identity encoding on a connection that is not reused', async ()=>{
	const seen: http.IncomingHttpHeaders[] = [];
	const server = await listen((req, res)=> {
		seen.push(req.headers);
		const body = JSON.stringify({ ok: true });
		res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
		res.end(body);
	});

	try {
		const response = await southernFetch(server.url);
		expect(response.status).toBe(200);
		expect(response.text).toBe('{"ok":true}');
		expect(seen[0]['accept-encoding']).toBe('identity');
		expect(seen[0].connection).toBe('close');
	}
	finally {
		await server.close();
	}
});

test('a gzip body with a content length is still decoded', async ()=>{
	const payload = Buffer.from('{"zipped":true}');
	const gzip = zlib.gzipSync(payload);
	const server = await listen((_req, res)=> {
		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Content-Encoding': 'gzip',
			'Content-Length': gzip.length
		});
		res.end(gzip);
	});

	try {
		const response = await southernFetch(server.url);
		expect(response.text).toBe('{"zipped":true}');
	}
	finally {
		await server.close();
	}
});

test('a truncated body is read again', async ()=>{
	let hits = 0;
	const server = await listen((_req, res)=> {
		hits += 1;
		if(hits === 1){
			res.writeHead(200, { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' });
			res.write('5\r\n{"a":');
			res.destroy();
			return;
		}
		const body = '{"ok":true}';
		res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
		res.end(body);
	});

	try {
		const response = await southernFetch(server.url);
		expect(response.text).toBe('{"ok":true}');
		expect(hits).toBe(2);
	}
	finally {
		await server.close();
	}
});
