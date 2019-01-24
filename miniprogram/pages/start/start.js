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

    if (userInfo) {
      this.getUserPermission()

      app.globalData.userInfo = userInfo

      this.setData({
        hasAuthorize: true
      })

      wx.redirectTo({
        url: '/pages/index/index',
      })
    } else {
      this.onError()
    }
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
  },
  getUserPermission() {
    wx.cloud.callFunction({
      name: 'login'
    }).then(({ result: { openid }}) => {
      app.openid = openid
      return Promise.all([app.db.collection('user').where({
        id: openid
      }).get(), Promise.resolve(openid)])
    }).then(([user, openid]) => {
      if (user.data.length === 0) {
        app.db.collection('user').add({
          data: {
            id: openid,
            role: 0
          }
        })
      } else {
        const u = user.data[0]
        if (u.role === 100) {
          app.isAdmin = true
          return
        }
      }
      app.isAdmin = false
    }).catch(err => {
      app.isAdmin = false
    })
  }
})
