import http from 'http';
import https from 'https';
import zlib from 'zlib';
import fetch, { Headers, Response } from 'node-fetch';
import { DebugLogger, safeUrl } from './debug';

/**
 * node-fetch 2 pipes gzip responses through Gunzip and then treats a chunked
 * body with no Content-Length as truncated whenever the keep-alive socket
 * still has a data listener. Node 19+ keeps sockets alive, and that check
 * false-positives (node-fetch#1767, nodejs/node#63989). Ask for an identity
 * body with a Content-Length, on a connection that will not be reused.
 */
const httpsAgent = new https.Agent({ keepAlive: false });
const httpAgent = new http.Agent({ keepAlive: false });

export interface SouthernResponse {
	status: number;
	statusText: string;
	headers: Headers;
	text: string;
}

export function isTruncatedBodyError(error: unknown): boolean {
	if(!error || typeof error !== 'object'){
		return false;
	}

	const err = error as { code?: string; errno?: string; message?: string };
	const detail = `${err.code || ''} ${err.errno || ''} ${err.message || ''}`;
	return /premature close|ERR_STREAM_PREMATURE_CLOSE|ECONNRESET|EPIPE|socket hang up/i.test(detail);
}

export async function southernFetch(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}, debug?: DebugLogger): Promise<SouthernResponse> {
	let lastError: unknown;

	for(let attempt = 0; attempt < 2; attempt++){
		try {
			return await southernFetchOnce(url, init);
		}
		catch(error){
			lastError = error;
			if(!isTruncatedBodyError(error) || attempt === 1){
				throw error;
			}
			debug?.log('http.retry', { path: safeUrl(url), reason: 'truncated-body' });
		}
	}

	throw lastError;
}

async function southernFetchOnce(url: string, init: { method?: string; headers?: Record<string, string>; body?: string }): Promise<SouthernResponse> {
	const headers: Record<string, string> = {
		...init.headers,
		'Accept-Encoding': 'identity',
		Connection: 'close'
	};
	const response = await fetch(url, {
		method: init.method || 'GET',
		headers,
		body: init.body,
		redirect: 'manual',
		compress: false,
		agent: agentFor(url)
	});

	let raw: Buffer;
	try {
		raw = await response.buffer();
	}
	catch(error){
		destroyBody(response);
		throw error;
	}

	const text = (await decodeBody(response.headers.get('content-encoding'), raw)).toString('utf8');
	return {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
		text
	};
}

function agentFor(url: string): http.Agent {
	const protocol = new URL(url).protocol;
	return protocol === 'http:' ? httpAgent : httpsAgent;
}

function destroyBody(response: Response): void {
	const body = response.body as unknown as { destroy?: (error?: Error)=> void } | null;
	body?.destroy?.();
}

async function decodeBody(encoding: string | null, buffer: Buffer): Promise<Buffer> {
	const coding = (encoding || '').trim().toLowerCase();
	if(!coding || coding === 'identity'){
		return buffer;
	}
	if(coding === 'gzip' || coding === 'x-gzip'){
		return inflate(zlib.gunzip, buffer);
	}
	if(coding === 'deflate' || coding === 'x-deflate'){
		try {
			return await inflate(zlib.inflate, buffer);
		}
		catch {
			return inflate(zlib.inflateRaw, buffer);
		}
	}
	if(coding === 'br' && typeof zlib.brotliDecompress === 'function'){
		return inflate(zlib.brotliDecompress, buffer);
	}
	return buffer;
}

function inflate(fn: typeof zlib.gunzip, buffer: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject)=> {
		fn(buffer, (error, result)=> error ? reject(error) : resolve(result));
	});
}
