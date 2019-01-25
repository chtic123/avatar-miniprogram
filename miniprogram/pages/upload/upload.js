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
    type: '',
    delList: [],
    delFileList: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (option) {
    this.setData({
      type: option.type,
      list: app.images[option.collection]
    })
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
        this.setUrl(res, collection)
        cb && cb()
      })
      .catch(err => {
        console.error(err)
        wx.showToast({
          title: `获取${collection}失败`
        })
      })
  },
  setUrl(list, collection) {
    Promise.all(list.map(item => new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: item.url,
        success: res => {
          resolve({ url: res.path, id: item._id, fileId: item.url })
        },
        fail: err => {
          console.error(err)
          reject(err)
        }
      })
    }))).then(trueList => {
      app.images[collection + 's'] = trueList
      this.setData({
        list: trueList
      })
    }).catch(() => {
      wx.showToast({
        title: '刷新失败，请退出重进',
        icon: 'none'
      })
    })
  },
  onSelect(e) {
    if (!this.data.isHandling) {
      return
    }
    const { id, file } = e.currentTarget.dataset
    const { delList, delFileList, list } = this.data
    const index = delList.findIndex(item => item === id)

    if (index > -1) {
      delList.splice(index, 1)
      delFileList.splice(index, 1)
    } else {
      delList.push(id)
      delFileList.push(file)
    }

    list.forEach(item => {
      if (item.id === id) {
        item.selected = !item.selected
      }
    })

    this.setData({
      delList,
      list,
      delFileList,
      canDel: delList.length > 0
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
  },
  onDelete() {
    const { delList, delFileList, type } = this.data
    
    wx.showLoading({
      title: '正在删除...'
    })
    const dbDelList = delList.map(id => app.db.collection(type).doc(id).remove())

    Promise.all(dbDelList)
      .then(res => {
        const list = res.map((item, index) => {
          if (item.stats.removed === 1) {
            return delFileList[index]
          } else {
            return false
          }
        }).filter(item => item)

        wx.cloud.deleteFile({
          fileList: list
        }).then(res => {
          const successList = res.fileList.filter(item => item.status === 0)

          this.setData({
            delList: [],
            delFileList: []
          })
          
          this.getData(this.data.type, function () {
            wx.hideLoading()
            wx.showToast({
              title: `成功删除数据${delFileList.length}条，删除文件成功${successList.length}个,删除文件失败${res.length - successList.length}个`
            })
          })
        }).catch(error => {
          console.log(error)
          this.setData({
            delList: [],
            delFileList: []
          })

          this.getData(this.data.type, function () {
            wx.hideLoading()
            wx.showToast({
              title: '删除数据成功，删除文件失败',
              icon: 'none'
            })
          })
        })
      })
      .catch(error => {
        console.log(error)
        this.setData({
          delList: [],
          delFileList: []
        })

        this.getData(this.data.type, function () {
          wx.hideLoading()
          wx.showToast({
            title: '删除失败',
            icon: 'none'
          })
        })
      })
  }
})