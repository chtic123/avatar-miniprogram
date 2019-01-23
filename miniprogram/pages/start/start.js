//index.js
const app = getApp()

Page({
  data: {
    hasAuthorize: true
  },
  onLoad() {
    wx.getSetting({
      success: res => {
        const hasAuthorize = !!res.authSetting['scope.userInfo']
        if (hasAuthorize) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          this.onGetUserInfo()
        }

        this.setData({
          hasAuthorize
        })
      }
    })
  },
  onAuthorize(res) {
    const { userInfo } = res.detail

    app.globalData.userInfo = userInfo

    this.setData({
      hasAuthorize: true
    })
    
    wx.cloud.callFunction({
      name: 'login',
      data: res.detail
    }).then(({ result: { openid }}) => {
      console.log(openid)
    }).catch(err => {
      app.isAdmin = false
    })
  },
  onError() {
    wx.showToast({
      title: '获取用户头像失败',
      icon: 'none',
      mask: true
    })
    this.setData({
      hasAuthorize: false
    })
  },
  onGetUserInfo() {
    wx.getUserInfo({
      success: res => {
        this.onAuthorize({ detail: res })
      },
      fail: this.onError
    })
  }
})