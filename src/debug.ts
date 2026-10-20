export interface DebugLogger {
	enabled: boolean;
	log(step: string, details?: Record<string, unknown>): void;
}

const SECRET_KEY = /password|token|authid|authorization|jwt|secret|verifier|cookie/i;

/** Cookie names are safe to log. Cookie values are not. */
function isSecretKey(key: string): boolean {
	if(/cookie/i.test(key) && /name/i.test(key)){
		return false;
	}
	return SECRET_KEY.test(key);
}

/** Opt-in via `config.debug` or `SOUTHERN_COMPANY_DEBUG=1`. Never prints secrets. */
export function isDebugEnabled(config?: { debug?: boolean }): boolean {
	if(config?.debug){
		return true;
	}

	const flag = process.env.SOUTHERN_COMPANY_DEBUG;
	return flag === '1' || flag === 'true' || flag === 'yes';
}

export function createDebugLogger(enabled: boolean): DebugLogger {
	return {
		enabled,
		log(step, details){
			if(!enabled){
				return;
			}

			const suffix = details ? ` ${JSON.stringify(sanitize(details))}` : '';
			console.log(`[southern-company-api] ${step}${suffix}`);
		}
	};
}

export function safeUrl(url: string): string {
	try {
		const parsed = new URL(url);
		return `${parsed.host}${parsed.pathname}`;
	}
	catch {
		return url.split('?')[0];
	}
}

export function sanitize(value: unknown): unknown {
	if(Array.isArray(value)){
		return value.map(sanitize);
	}

	if(value && typeof value === 'object'){
		const out: Record<string, unknown> = {};
		for(const [key, entry] of Object.entries(value as Record<string, unknown>)){
			out[key] = isSecretKey(key) ? '[redacted]' : sanitize(entry);
		}
		return out;
	}

	if(typeof value === 'string' && /^eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)){
		return '[redacted]';
	}

	return value;
}

export function redactSecrets(text: string): string {
	return text
		.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 300);
}
