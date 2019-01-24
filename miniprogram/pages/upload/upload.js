// miniprogram/pages/upload/upload.js
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    isHandling: false,
    canDel: false,
    type: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (option) {
    this.setData({
      type: option.type
    })
    this.getData(option.type)
  },
  getData(collection, cb) {
    app.db.collection(collection).count()
      .then(res => {
        const count = res.total
        let index = 0
        const getList = []
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
      .then(res => {
        this.setData({
          list: res
        })
        cb && cb()
      })
      .catch(err => {
        console.error(err)
        wx.showToast({
          title: `获取${collection}失败`
        })
      })
  },
  onToggle() {
    this.setData({
      isHandling: !this.data.isHandling
    })
  },
  onUpload() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        this.upload(res.tempFilePaths[0])
      }
    })
  },
  upload(imgUrl) {
    wx.showLoading({
      title: '正在上传...',
      mask: true
    })
    const type = imgUrl.match(/\.[^.]+?$/)
    wx.cloud.uploadFile({
      cloudPath: app.openid + Date.now() + type, // 上传至云端的路径
      filePath: imgUrl, // 小程序临时文件路径
      success: res => {
        app.db.collection(this.data.type).add({
          data: {
            url: res.fileID
          }
        }).then(res => {          
          this.getData(this.data.type, function() {
            wx.hideLoading()
            wx.showToast({
              title: '上传成功'
            })
          })
        }).catch(err => {
          wx.hideLoading()
          console.error(err)
          wx.showToast({
            title: `上传失败`,
            icon: 'none'
          })
        })          
      },
      fail: err => {
        wx.hideLoading()
        console.error(err)
        wx.showToast({
          title: `上传失败`,
          icon: 'none'
        })
      }
    })
  }
})