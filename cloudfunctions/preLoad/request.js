const qs = require('querystring');
const superagent = require('superagent');

const cloud = require('./cloud');
const { serverConfig } = require('./server-config');

/**
 * @
 *
 * @class Request
 */
class Request {
  async run(cmd, options) {
    const { query, cookie, ...otherOpts } = options;

    const reqQuery = this.getRequestQuery(query, cookie);

    const reqOptions = { ...otherOpts, query: reqQuery };

    // try {
    const l5Res = await this.requestL5(cmd, reqOptions);

    return l5Res;
    // } catch (err) {
    // // l5拉取失败，降级http
    // const httpRes = await this.requestHttp(cmd, reqOptions).catch((err) => ({
    //   test: 11111
    // }));

    // return httpRes;
    //   return {
    //     haha: err
    //   };
    // }
  }

  requestHttp(cmd, options) {}

  requestL5(cmd, options) {
    const { l5, method = 'get', query, body, headers = {} } = options;
    const config = serverConfig[l5];

    if (config) {
      const { cmdid, modid } = config;
      let path = cmd;

      if (path.indexOf('?') < 0) {
        path += '?';
      }

      path = `${path}${path.endsWith('?') ? '' : '&'}${qs.stringify(query)}`;

      const callOptions = {
        cmdid,
        modid,
        path,
        method,
        headers,
        autoParse: true
      };

      if (body) {
        callOptions.body = body;
      }

      if (!headers.hasOwnProperty('Content-Type') && typeof body === 'object') {
        callOptions.headers['Content-Type'] =
          'application/x-www-form-urlencoded; charset=UTF-8';
        callOptions.body = qs.stringify(body);
      }

      console.log('l5 参数: ', callOptions);

      /**
       * 通过l5调用内部服务
       *
       * @param {number} cmdid 必填
       * @param {number} modid 必填
       * @param {string} path 必填，除域名外 URL 路径。URL 参数选填
       * @param {boolean} https 选填，是否使用 https
       * @param {string} method 必填，HTTP Method
       * @param {object} headers 选填，HTTP 头部
       * @param {string | Buffer} body 选填，body 可以是 string 类型或 Buffer 类型
       * @param {boolean} autoParse 选填，是否自动 parse 回包包体，如果是，则：
       *   - 在 content-type 为 application/json 时自动 parse JSON
       *   - 在 content-type 为 text/plain 时自动转为 string
       *   - 其余情况不 parse，返回原始包体 buffer
       *
       **/
      return cloud.callTencentInnerAPI(callOptions);
    }
  }

  /**
   *
   * @param {object} query 请求的query参数
   * @param {string} cookie
   * @returns
   */
  getRequestQuery(query = {}, cookie) {
    const queryObj = {
      ...query,
      bkn: this.getBkn(cookie),
      r: Math.random()
    };
    return queryObj;
  }

  getBkn(cookie) {
    if (!cookie) {
      return '';
    }

    const cookieObj = qs.parse(cookie, ';');
    for (let k of ['p_lskey', 'p_skey', 'uid_a2', 'skey', 'token']) {
      const auth = cookieObj[k];
      if (auth) {
        return this.encryptSkey(auth);
      }
    }

    return '';
  }

  encryptSkey(str) {
    if (!str) {
      return '';
    }
    let hash = 5381;
    for (let i = 0, len = str.length; i < len; ++i) {
      // eslint-disable-next-line no-bitwise
      hash += (hash << 5) + str.charAt(i).charCodeAt(0);
    }
    // eslint-disable-next-line no-bitwise
    return hash & 0x7fffffff;
  }
}

const request = new Request();

module.exports = request.run.bind(request);
