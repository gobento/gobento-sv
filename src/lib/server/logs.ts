import { APP_URL } from '$env/static/private';

export async function log(statusCode: number, event) {
	try {
		let level = 'info';
		if (statusCode >= 400) {
			level = 'error';
		}
		const error = event?.locals?.error || undefined;
		const errorId = event?.locals?.errorId || undefined;
		const errorStackTrace = event?.locals?.errorStackTrace || undefined;
		let urlParams = {};
		if (event?.url?.search) {
			urlParams = await getAllUrlParams(event?.url?.search);
		}
		let messageEvents = {};
		if (event?.locals?.message) {
			messageEvents = await parseMessage(event?.locals?.message);
		}
		let trackEvents = {};
		if (event?.locals?.track) {
			trackEvents = await parseTrack(event?.locals?.track);
		}

		let referer = event.request.headers.get('referer');
		if (referer) {
			const refererUrl = await new URL(referer);
			const refererHostname = refererUrl.hostname;
			if (refererHostname === 'localhost' || refererHostname === APP_URL) {
				referer = refererUrl.pathname;
			}
		} else {
			referer = undefined;
		}
		const logData: object = {
			level: level,
			method: event.request.method,
			path: event.url.pathname,
			status: statusCode,
			timeInMs: Date.now() - event?.locals?.startTimer,
			user: event?.locals?.user?.email,
			userId: event?.locals?.user?.userId,
			referer: referer,
			error: error,
			errorId: errorId,
			errorStackTrace: errorStackTrace,
			...urlParams,
			...messageEvents,
			...trackEvents
		};
		console.log('log: ', JSON.stringify(logData));
	} catch (err) {
		throw new Error(`Error Logger: ${JSON.stringify(err)}`);
	}
}

export async function getAllUrlParams(url: string): Promise<object> {
	let paramsObj = {};
	try {
		url = url?.slice(1); //remove leading ?
		if (!url) return {}; //if no params return
		paramsObj = await Object.fromEntries(await new URLSearchParams(url));
	} catch (error) {
		console.log('error: ', error);
	}
	return paramsObj;
}

export async function parseMessage(message: unknown): Promise<object> {
	let messageObj = {};
	try {
		if (message) {
			if (typeof message === 'string') {
				messageObj = { message: message };
			} else {
				messageObj = message;
			}
		}
	} catch (error) {
		console.log('error: ', error);
	}
	return messageObj;
}

export async function parseTrack(track: unknown): Promise<object> {
	let trackObj = {};
	try {
		if (track) {
			if (typeof track === 'string') {
				trackObj = { track: track };
			} else {
				trackObj = track;
			}
		}
	} catch (error) {
		console.log('error: ', error);
	}
	return trackObj;
}
