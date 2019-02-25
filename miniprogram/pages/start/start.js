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
      this.getSwiperItems()

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
          app.getUserPermissionCallback && app.getUserPermissionCallback()
          return
        }
      }
      app.isAdmin = false
    }).catch(err => {
      app.isAdmin = false
    })
  },
  getSwiperItems() {
    this.getTemplates()
      .then(templates => {
        this.setUrl(templates, 'templates')
      })
    this.getFrames()
      .then(frames => {
        this.setUrl(frames, 'frames')
      })
    this.getOrnaments()
      .then(ornaments => {
        this.setUrl(ornaments, 'ornaments')
      })
  },
  setUrl(list, collection) {
    list.map((item, index) => {
      wx.getImageInfo({
        src: item.url,
        success: res => {
          const imageData = { url: res.path, id: item._id, fileId: item.url }
          app.images[collection][index] = imageData
          app.getSwiperItemCallback && app.getSwiperItemCallback(collection, imageData, index)
        },
        fail: err => {
          console.error(err)
        }
      })
    })
  },
  getTemplates() {
    return this.getData('template')
  },
  getFrames() {
    return this.getData('frame')
  },
  getOrnaments() {
    return this.getData('ornament')
  },
  getData(collection) {
    return app.db.collection(collection).count()
      .then(res => {
        const count = res.total
        let index = 0
        const getList = []
        app.images[collection + 's'] = Array.apply(null, {length: count}).map(item => {
          return {
            url: ''
          }
        })
        while (index < count) {
          if (index === 0) {
            getList.push(app.db.collection(collection).get())
          } else {
            getList.push(app.db.collection(collection).skip(index).get())
          }

          index += 20
        }

        if (getList.length > 0) {
          return Promise.all(getList)
            .then(result => {
              return [].concat(...result.map(rs => rs.data))
            })
        }

        return Promise.resolve([])
      })
      .catch(err => {
        console.error(err)
        wx.showToast({
          title: `获取${collection}失败`
        })
      })
  }
})
