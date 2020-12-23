import { URL } from 'url';

export const parse = (url, origin) => new URL(url, origin);
export const isLocal = (url, origin) => url.origin === origin;
