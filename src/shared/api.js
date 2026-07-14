const IS_DEV = import.meta.env.DEV;
const API_URL = IS_DEV
  ? '/api/General/GeneralAPI/'
  : 'https://quick.glcpaints.com:7003/General/GeneralAPI/';

const BASE_BODY = {
  AppVersionWeb: '225',
  AppVersionAndroid: '225',
  AppVersionIos: '225',
  AppVersionDesktop: '225',
  FireBaseToken: '',
  PlatForm: 'web',
  deviceID: '',
  IP: '192.168.1.3'
};

export async function apiCall(operation, lineData = null, extraParams = {}, apiType = 'default') {
  const target = (apiType === true || apiType === 'express') 
    ? 'express' 
    : (apiType === 'hr' 
      ? 'hr' 
      : (apiType === 'plus' 
        ? 'plus' 
        : (apiType === 'query' 
          ? 'query' 
          : (apiType === 'purchasing' 
            ? 'purchasing' 
            : (apiType === 'logistics' 
              ? 'logistics' 
              : (apiType === 'express_codes' 
                ? 'express_codes' 
                : 'default'))))));

  let url = '';
  let spName = '';

  const isGitHubPages = window.location.hostname === 'malkholy.github.io';

  if (target === 'express') {
    url = IS_DEV ? '/express-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7790/General/GeneralAPI/';
    spName = 'APIExprssControlOperation';
  } else if (target === 'hr') {
    url = IS_DEV ? '/hr-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7001/General/GeneralAPI/';
    spName = 'APIHRControlOperation';
  } else if (target === 'plus') {
    url = IS_DEV ? '/plus-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7003/General/GeneralAPI/';
    spName = 'APIPlusOperation';
  } else if (target === 'query') {
    url = IS_DEV ? '/query-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7003/General/GeneralAPI/';
    spName = 'APIPlusQueryOperation';
  } else if (target === 'purchasing') {
    url = (IS_DEV || isGitHubPages) 
      ? (IS_DEV ? '/purchasing-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7003/General/GeneralAPI/') 
      : '/plus-api/General/GeneralAPI/';
    spName = (IS_DEV || isGitHubPages) ? 'APIPlusPurchasingOperation' : 'APIPlusOperation';
  } else if (target === 'logistics') {
    url = IS_DEV ? '/logistics-api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7003/General/GeneralAPI/';
    spName = 'APIPlusLogisticsOperation';
  } else if (target === 'express_codes') {
    url = IS_DEV ? '/express-codes-api/Express/GeneralAPI' : 'https://be.glcpaints.com:7788/Express/GeneralAPI';
    spName = 'APIPlusExpressGenerateCodeOperation';
  } else {
    url = IS_DEV ? '/api/General/GeneralAPI/' : 'https://quick.glcpaints.com:7003/General/GeneralAPI/';
    spName = 'APIERPControlOperation';
  }

  let method = 'POST';
  let headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'SP_Name': spName
  };
  let body = JSON.stringify({
    ...BASE_BODY,
    Operation: operation,
    LineData: lineData ? JSON.stringify(lineData) : null,
    User: sessionStorage.getItem('Username') || sessionStorage.getItem('FullName') || '',
    ...extraParams
  });

  if (target === 'express_codes') {
    method = 'POST';
    headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'SP_Name': spName,
      'Authorization': 'Bearer YMQs3vAyVUmtiZi-89cRxro4ZPloFJD8zdbnG5b0XpZtvhdT4yuH47HmOoPAWl8kZHl9mgGYG_vUFlTWIiJLZNRZqHgAAkmHuN7XPnqIGVSvlE7gsXuxwW5OMzDMC5Ffm3E-l5Phi9ZSZlwmzs2es6piK0Q-hjt1L7hvLyEgru-h97pLL8rCvmOpvjIYm0SRU-cOJkPCuKvpClR5uCyrOw'
    };
    body = JSON.stringify({
      Operation: operation,
      LineData: lineData ? JSON.stringify(lineData) : '',
      User: sessionStorage.getItem('Username') || sessionStorage.getItem('FullName') || 'System',
      AppVersionWeb: 225,
      AppVersionAndroid: 225,
      AppVersionIos: 225,
      AppVersionDesktop: 225,
      PlatForm: 'web',
      FireBaseToken: ''
    });
  }

  const res = await fetch(url, {
    method,
    headers,
    body
  });
  const text = await res.text();
  console.log(operation, 'raw:', text);
  if (!text) throw new Error('Empty response from server');
  return JSON.parse(text);
}



