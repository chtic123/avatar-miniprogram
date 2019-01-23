//app.js
App({
  onLaunch() {
    this.globalData.sysInfo = wx.getSystemInfoSync()
  },
  globalData: {
    userInfo: null,
    sysInfo: null,
    imageInfo: {}
  }
})