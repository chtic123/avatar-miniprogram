const qs = require('querystring');
const request = require('./request');
const { serverType } = require('./server-config');
require('./cloud');

async function fetchIndexTop(query = {}) {
  // try {
  const res = await request('/cgi-proxy/feeds/get_homepage_feeds_h5', {
    l5: serverType.CGIProxy,
    query: {
      platform: 5,
      is_ios_h5: 1,
      page: 0,
      count: 20,
      req_type: 1,
      type_no_return: JSON.stringify([3]),
      account_type: 1001,
      ...query
    }
  });

  const sas = await request('/cgi-bin/ke_miniapp_preLoad', {
    l5: serverType.Sas
  });

  return {
    data: res,
    sas,
    timestamp: Date.now()
  };
  // } catch (error) {
  //   return {
  //     error,
  //     test: 11111
  //   };
  // }
}

const preFetchMap = {
  'pages/start/start': fetchIndexTop
};

// 云函数入口函数
exports.main = async (event) => {
  // try {
  const { path, query = '' } = event;

  // 有path字段且字段类型为string是预拉取
  // 当然这里从event取的值是可以通过参数来模拟的
  if (typeof path !== 'string') {
    return {
      error: {
        pathType: typeof path,
        event,
        type: 'CLOUD',
        retcode: -1001,
        msg: '当前云函数只支持预拉取'
      }
    };
  }

  // 兜底小程序的首页
  // 如果没有指定打开的页面路径，path为空字符串
  const openPath = path || 'pages/start/start';
  const pathKey = openPath.replace(/\/?(pages\/)/, 'pages/');
  const fetchFn = preFetchMap[pathKey];

  if (fetchFn) {
    const queryObj = qs.parse(query);
    const res = await fetchFn(queryObj);

    return res;
  }

  return {
    error: {
      pathType: typeof path,
      event,
      type: 'CLOUD',
      retcode: -1002,
      msg: `${openPath}页面未设置预拉取逻辑`
    }
  };
  // } catch (error) {
  //   return {
  //     error
  //   };
  // }
};
