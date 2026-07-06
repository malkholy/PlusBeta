const url = 'https://quick.glcpaints.com:7003/General/GeneralAPI/';
const spName = 'APIPlusOperation';

async function test() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'SP_Name': spName
      },
      body: JSON.stringify({
        AppVersionWeb: '225',
        AppVersionAndroid: '225',
        AppVersionIos: '225',
        AppVersionDesktop: '225',
        FireBaseToken: '',
        PlatForm: 'web',
        deviceID: '',
        IP: '192.168.1.3',
        Operation: 'GetItemBalanceSchema',
        LineData: null,
        User: 'TestUser'
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}

test();
