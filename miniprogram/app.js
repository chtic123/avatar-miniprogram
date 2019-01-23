//app.js
App({
  onLaunch() {
    this.globalData.sysInfo = wx.getSystemInfoSync()
    wx.cloud.init({
      traceUser: true,
      env: 'avatar-c3e394'
    })
    this.db = wx.cloud.database()
  },
  globalData: {
    userInfo: null,
    sysInfo: null,
    imageInfo: {}
  }
})