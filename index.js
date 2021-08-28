const axios = require('axios');

const QUERY = {
  LoginToken: "mutation LoginToken($user: String!, $password: String!, $id: String!, $country: String!, $lang: String!, $callby: String!) {\n  xSLoginToken(user: $user, password: $password, id: $id, country: $country, lang: $lang, callby: $callby) {\n    res\n    msg\n    hash\n    lang\n    legals\n    mainUser\n    changePassword\n  }\n}\n",
  InstallationList: "query InstallationList {\n  xSInstallations {\n    installations {\n      numinst\n      alias\n      panel\n      type\n      name\n      surname\n      address\n      city\n      postcode\n      province\n      email\n      phone\n    }\n  }\n}\n",
  CheckAlarm: "query CheckAlarm($numinst: String!, $panel: String!) {\n  xSCheckAlarm(numinst: $numinst, panel: $panel) {\n    res\n    msg\n    referenceId\n  }\n}\n",
  CheckAlarmStatus: "query CheckAlarmStatus($numinst: String!, $idService: String!, $panel: String!, $referenceId: String!) {\n  xSCheckAlarmStatus(numinst: $numinst, idService: $idService, panel: $panel, referenceId: $referenceId) {\n    res\n    msg\n    status\n    numinst\n    protomResponse\n    protomResponseDate\n  }\n}\n",
  xSArmPanel: "mutation xSArmPanel($numinst: String!, $request: ArmCodeRequest!, $panel: String!, $pin: String, $currentStatus: String) {\n  xSArmPanel(numinst: $numinst, request: $request, panel: $panel, pin: $pin, currentStatus: $currentStatus) {\n    res\n    msg\n    referenceId\n  }\n}\n",
  xSDisarmPanel: "mutation xSDisarmPanel($numinst: String!, $request: DisarmCodeRequest!, $panel: String!, $pin: String) {  xSDisarmPanel(numinst: $numinst, request: $request, panel: $panel, pin: $pin) {    res    msg    referenceId  }}",
  ArmStatus: "query ArmStatus($numinst: String!, $request: ArmCodeRequest, $panel: String!, $referenceId: String!, $counter: Int!) {\n  xSArmPanelStatus(numinst: $numinst, panel: $panel, referenceId: $referenceId, counter: $counter, request: $request) {\n    res\n    msg\n    status\n    protomResponse\n    protomResponseDate\n    numinst\n    requestId\n  }\n}\n",
  DisarmStatus: "query DisarmStatus($numinst: String!, $panel: String!, $referenceId: String!, $counter: Int!, $request: DisarmCodeRequest) {\n  xSDisarmPanelStatus(numinst: $numinst, panel: $panel, referenceId: $referenceId, counter: $counter, request: $request) {\n    res\n    msg\n    status\n    protomResponse\n    protomResponseDate\n    numinst\n    requestId\n  }\n}\n"
}

const STATUS = {
  ARM: "ARMINTFPART1", // T
  DISARM: "DARM1", // D
  NIGHT: "ARMNIGHT1" // Q
}

const client = axios.create({
  baseURL: 'https://customers.verisure.it/owa-api/graphql',
});

client.interceptors.response.use(async (response) => {
  const data = response.data.data;
  const keys = Object.keys(data);
  const res = data[keys[0]];

  if (!res) {
    const err = response.data.errors[0];
    const error = new Error('Unknown response');
    error.response = {
      ...response,
      err,
    };
    error.code = err && err.data && err.data.err;

    return Promise.reject(error);
  }

  return res;
});

const sleep = (seconds) => new Promise((resolve) => {
  setTimeout(resolve, seconds * 1000);
});

const buildId = (user) => {
  const date = new Date().toISOString().substring(0, 19).replace(/\D/g, '');
  return `OWP_______________${user}_______________${date}`;
};

class SecuritasDirect {

  auth = {
    "user": "",
    "id": "",
    "country": "",
    "lang": "",
    "callby": "OWP_10",
    "hash": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzMzkyMDQyNzk1IiwiY250IjoiSVQiLCJjYnkiOiJPV1BfMTAiLCJqdGkiOiIxMmI2NjljZS1jZDAxLTRmMWQtODQ3Yy1jZTYzZTM2N2JhOTQiLCJpYXQiOjE2MzAxODM5NjEsImV4cCI6MTYzMDE4NDg2MX0.2ym5h5x2WWuuhbxZGwL2BZMELJApRZrvLrfneCDxVWY"
  }
  installation = "2415572";
  password = "";

  constructor(username, password, country) {
    this.auth.user = username;
    this.auth.id = buildId(username);
    this.auth.country = country.toUpperCase();
    this.auth.lang = country;
    this.password = password;
  }

  async login() {
    return client({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        operationName: "LoginToken",
        variables: {
          country: this.auth.country,
          id: this.auth.id,
          lang: this.auth.lang,
          password: this.password,
          user: this.auth.user,
          callby: this.auth.callby,
        },
        query: QUERY.LoginToken
      }
    }).then((res) => {
      console.log("Login: ", res);
      this.auth.hash = res.hash;
      return this.auth.hash;
    }).catch((err) => {
      console.log(err);
    });
  }

  // TODO: Implement
  logout() {
  }

  getInstallation() {
    return client({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth': JSON.stringify(this.auth)
      },
      data: {
        operationName: "InstallationList",
        variables: {},
        query: QUERY.InstallationList
      }
    }).then((res) => {
      this.installation = res.installations[0].numinst;
    });
  }

  async checkAlarm(panel) {
    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth': JSON.stringify(this.auth)
      },
      data: {
        operationName: "CheckAlarm",
        variables: {
          numinst: this.installation,
          panel,
        },
        query: QUERY.CheckAlarm
      }
    };

    const response = await client(request)
      .catch(async (error) => {
        // Invalid session. Please, try again later.
        if (error.code === '60022') {
          this.auth.hash = await this.login().catch((error) => { console.log(error) });
          return this.checkAlarm(panel);
        }

        if (error.code) {
          throw error;
        }

        return null;
      });

    if (response && response.res === 'OK') {
      return response;
    }
  }

  async checkStatus(referenceId, panel, retries = 1, interval = 5) {
    if (retries > 8) {
      return Promise.reject(new Error('Too many retries'));
    }
    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth': JSON.stringify(this.auth)
      },
      data: {
        operationName: "CheckAlarmStatus",
        variables: {
          numinst: this.installation,
          panel,
          referenceId: referenceId,
          idService: '11',
          counter: retries
        },
        query: QUERY.CheckAlarmStatus
      },
    };

    const response = await client(request)
      .catch(async (error) => {
        // Invalid session. Please, try again later.
        if (error.code === '60022') {
          this.auth.hash = await this.login().catch((error) => { console.log(error) });
          return this.checkStatus(referenceId, panel, retries, interval);
        }

        if (error.code) {
          throw error;
        }

        return null;
      });

    if (response && response.res === 'OK') {
      return response;
    }

    await sleep(interval);

    return this.checkStatus(referenceId, panel, retries + 1);
  }

  async setAlarm(currentStatus, armType, panel) {
    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth': JSON.stringify(this.auth)
      },
      data: {
        operationName: armType === STATUS.DISARM ? "xSDisarmPanel" : "xSArmPanel",
        variables: {
          request: armType,
          currentStatus: currentStatus,
          numinst: this.installation,
          panel,
        },
        query: armType === STATUS.DISARM ? QUERY.xSDisarmPanel : QUERY.xSArmPanel
      }
    };

    const response = await client(request)
      .catch(async (error) => {
        // Invalid session. Please, try again later.
        if (error.code === '60022') {
          this.auth.hash = await this.login().catch((error) => { console.log(error) });
          return this.setAlarm(currentStatus, armType, panel);
        }

        if (error.code) {
          throw error;
        }

        return null;
      });

    if (response && response.res === 'OK') {
      return response;
    }
  }

  async checkAlarmStatus(referenceId, currentStatus, armType, panel, retries = 1, interval = 5) {
    if (retries > 8) {
      return Promise.reject(new Error('Too many retries'));
    }
    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'auth': JSON.stringify(this.auth)
      },
      data: {
        operationName: armType === STATUS.DISARM ? "DisarmStatus" : "ArmStatus",
        variables: {
          request: armType,
          currentStatus: currentStatus,
          numinst: this.installation,
          panel,
          referenceId: referenceId,
          counter: retries
        },
        query: armType === STATUS.DISARM ? QUERY.DisarmStatus : QUERY.ArmStatus
      },
    };

    const response = await client(request)
      .catch(async (error) => {
        // Invalid session. Please, try again later.
        if (error.code === '60022') {
          this.auth.hash = await this.login().catch((error) => { console.log(error) });
          return this.checkAlarmStatus(referenceId, currentStatus, armType, panel, retries, interval);
        }

        if (error.code) {
          throw error;
        }

        return null;
      });

    if (response && response.res === 'OK') {
      return response;
    }

    await sleep(interval);

    return this.checkAlarmStatus(referenceId, currentStatus, armType, panel, retries + 1);
  }
}

module.exports = SecuritasDirect;