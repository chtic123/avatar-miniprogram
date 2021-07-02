// 云函数入口文件
const cloud = require('wx-server-sdk');
const wxgService = require('@tencent/wx-server-sdk-wxg-service');

cloud.init();
cloud.registerService(wxgService);

module.exports = cloud;
