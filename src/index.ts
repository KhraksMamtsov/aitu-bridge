import promisifyInvoke from './promisifyInvoke';
import promisifyStorage from './promisifyStorage';
import promisifyMethod from './promisifyMethod';

enum EInvokeRequest {
  getMe = 'GetMe',
  getPhone = 'GetPhone',
  getContacts = 'GetContacts',
  allowNotifications = 'AllowNotifications'
}

type SetItemType = (keyName: string, keyValue: string) => Promise<void>;
type GetItemType = (keyName: string) => Promise<string | null>;

interface GetPhoneResponse {
  phone: string;
  sign: string;
}

interface GetMeResponse {
  name: string;
  lastname: string;
  sign: string;
}

interface ResponseObject {
  phone?: string;
  name?: string;
  lastname?: string;
}

interface GetGeoResponse {
  latitude: number;
  longitude: number;
}

interface GetContactsResponse {
  contacts: Array<{
    first_name: string;
    last_name: string;
    phone: string;
  }>;
  sign: string;
}

type OpenSettingsResponse = 'success' | 'failed';
type ShareResponse = 'success' | 'failed';

type BridgeInvoke<T extends EInvokeRequest, R> = (method: T, data?: {}) => Promise<R>;

interface BridgeStorage {
  setItem: SetItemType,
  getItem: GetItemType
}

interface AituBridge {
  invoke: BridgeInvoke<EInvokeRequest, ResponseObject>;
  storage: BridgeStorage;
  getMe: () => Promise<GetMeResponse>;
  getPhone: () => Promise<GetPhoneResponse>;
  getContacts: () => Promise<GetContactsResponse>;
  getGeo: () => Promise<GetGeoResponse>;
  share: (text: string) => Promise<ShareResponse>;
  openSettings: () => Promise<OpenSettingsResponse>;
  isSupported: () => boolean;
  supports: (method: string) => boolean;
  sub: any;
}

const invokeMethod = 'invoke';
const storageMethod = 'storage';
const getGeoMethod = 'getGeo';
const openSettingsMethod = 'openSettings';
const shareMethod = 'share';

const android = typeof window !== 'undefined' && (window as any).AndroidBridge;
const ios = typeof window !== 'undefined' && (window as any).webkit && (window as any).webkit.messageHandlers;

const buildBridge = (): AituBridge => {
  const subs = [];

  if (typeof window !== 'undefined') {
    window.addEventListener('aituEvents', (e: any) => {
      [...subs].map((fn) => fn.call(null, e));
    })
  }

  const invoke = (reqId, method, data = {}) => {
    const isAndroid = android && android[invokeMethod];
    const isIos = ios && ios[invokeMethod];

    if (isAndroid) {
      android[invokeMethod](reqId, method, JSON.stringify(data));
    } else if (isIos) {
      ios[invokeMethod].postMessage({ reqId, method, data });
    } else if (typeof window !== 'undefined') {
      console.log('--invoke-isWeb');
    }
  };

  const storage = (reqId, method, data = {}) => {
    const isAndroid = android && android[storageMethod];
    const isIos = ios && ios[storageMethod];

    if (isAndroid) {
      android[storageMethod](reqId, method, JSON.stringify(data));
    } else if (isIos) {
      ios[storageMethod].postMessage({ reqId, method, data });
    } else if (typeof window !== 'undefined') {
      console.log('--storage-isWeb');
    }
  }

  const getGeo = (reqId) => {
    const isAndroid = android && android[getGeoMethod];
    const isIos = ios && ios[getGeoMethod];

    if (isAndroid) {
      android[getGeoMethod](reqId);
    } else if (isIos) {
      ios[getGeoMethod].postMessage({ reqId });
    } else if (typeof window !== 'undefined') {
      console.log('--getGeo-isWeb');
    }
  }

  const openSettings = (reqId) => {
    const isAndroid = android && android[openSettingsMethod];
    const isIos = ios && ios[openSettingsMethod];

    if (isAndroid) {
      android[openSettingsMethod](reqId);
    } else if (isIos) {
      ios[openSettingsMethod].postMessage({ reqId });
    } else if (typeof window !== 'undefined') {
      console.log('--openSettings-isWeb');
    }
  }

  const share = (reqId, text) => {
    const isAndroid = android && android[shareMethod];
    const isIos = ios && ios[shareMethod];

    if (isAndroid) {
      android[shareMethod](reqId, JSON.stringify(text));
    } else if (isIos) {
      ios[shareMethod].postMessage({ reqId, text });
    } else if (typeof window !== 'undefined') {
      console.log('--share-isWeb');
    }
  }

  const isSupported = () => {
    return android || ios;
  }

  const supports = (method) =>
    android
      ? !!(typeof android[method] === 'function')
      : ios
        ? !!(ios[method] && typeof ios[method].postMessage === 'function')
        : false;

  const sub = (listener: any) => {
    subs.push(listener);
  }

  const invokePromise = promisifyInvoke(invoke, sub);
  const storagePromise = promisifyStorage(storage, sub);
  const getGeoPromise = promisifyMethod(getGeo, sub);
  const openSettingsPromise = promisifyMethod(openSettings, sub);
  const sharePromise = promisifyMethod(share, sub);

  return {
    invoke: invokePromise,
    storage: storagePromise,
    getMe: () => invokePromise(EInvokeRequest.getMe),
    getPhone: () => invokePromise(EInvokeRequest.getPhone),
    getContacts: () => invokePromise(EInvokeRequest.getContacts),
    getGeo: getGeoPromise,
    openSettings: openSettingsPromise,
    share: sharePromise,
    isSupported,
    supports,
    sub
  }
}

const bridge = buildBridge();

export default bridge;
