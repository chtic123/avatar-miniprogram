const app = getApp()
const config = {
  image: {},
  moveInfo: {
    startX: 0,
    startY: 0
  },
  current: [],
  translatePoint: {}
}
const ornamentWidth = 50

Page({
  onLoad() {
    const ctx = wx.createCanvasContext('canvas')
    this.setData({
      ctx,
      canvasWidth: app.globalData.sysInfo.windowWidth * 0.8,
      isAdmin: app.isAdmin
    })

    const { path, posX, posY, width, height } = app.globalData.imageInfo
    config.image = {
      path,
      posX: (posX / 0.9) * 0.8,
      posY: (posY / 0.9) * 0.8,
      width: (width / 0.9) * 0.8,
      height: (height / 0.9) * 0.8
    }

    this.drawImage(ctx, [config.image])
    this.getSwiperItems()
    
    ctx.draw()
  },
  data: {
    ctx: {},
    pageInited: false,
    canvasWidth: 0,
    type: 1,
    templates: {
      showItem: 1,
      list: []
    },
    ornaments: {
      showItem: 1,
      list: []
    },
    selectTemplate: {},
    selectOrnaments: [],
    current: null,
    tapType: 'move',
    isAdmin: false
  },
  onChangeType(e) {
    this.setData({
      type: e.currentTarget.dataset.type
    })
  },
  onTemplateTap(e) {
    const index = e.currentTarget.dataset.index
    const { templates, canvasWidth } = this.data

    this.setData({
      selectTemplate: {
        path: templates.list[index].url,
        posX: 0,
        posY: 0,
        width: canvasWidth,
        height: canvasWidth
      }
    })

    this.drawImageCanvas(false)
  },
  onOrnamentTap(e) {
    const index = e.currentTarget.dataset.index

    const { ornaments, selectOrnaments, canvasWidth } = this.data

    wx.showLoading({
      title: '加载中',
      mask: true
    })
    wx.getImageInfo({
      src: ornaments.list[index].url,
      success: res => {
        const { width, height } = res
        const drawWidth = ornamentWidth
        const drawHeight = height * drawWidth / width

        selectOrnaments.push({
          path: ornaments.list[index].url,
          posX: (canvasWidth - drawWidth) / 2,
          posY: (canvasWidth - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
          scale: drawHeight / drawWidth,
          dist: Math.sqrt((drawWidth * drawWidth / 4) + (drawHeight * drawHeight / 4)),
          rotate: 0
        })

        this.drawImageCanvas(false)
        wx.hideLoading()
      }
    })
  },
  onTouchStart(e) {
    const { selectOrnaments } = this.data
    const { target, touches: [touch] } = e
    const onPosX = touch.clientX - target.offsetLeft
    const onPosY = touch.clientY - target.offsetTop
    const translatePoint = {
      x: 0,
      y: 0
    }

    config.moveInfo.startX = touch.clientX
    config.moveInfo.startY = touch.clientY

    const list = selectOrnaments.filter(item => {
      const { posX, posY, width, height, rotate } = item
      const middle = {
        x: posX + width / 2,
        y: posY + height / 2
      }
      const translate = {
        x: (onPosX - middle.x) * Math.cos(-rotate) - (onPosY - middle.y) * Math.sin(-rotate) + middle.x,
        y: (onPosY - middle.y) * Math.cos(-rotate) + (onPosX - middle.x) * Math.sin(-rotate) + middle.y
      }
      const inX = ((item.posX - 10) <= translate.x && translate.x <= (item.posX + item.width + 10))
      const inY = ((item.posY - 10) <= translate.y && translate.y <= (item.posY + item.height + 10))
      if (inX && inY) {
        translatePoint.x = translate.x
        translatePoint.y = translate.y
        return true
      } else {
        return false
      }
    })

    const current = list.length > 0 ? list[list.length - 1] : null
    this.setData({
      current
    })
    if (current) {
      if (this.isClose(translatePoint.x - current.posX, translatePoint.y - current.posY)) {
        this.data.selectOrnaments = selectOrnaments.filter(item => item !== current)
        this.setData({
          current: null
        })
        this.drawImageCanvas(false)
        return
      }

      if (this.isRotate(translatePoint.x - current.posX, translatePoint.y - current.posY, current.width, current.height)) {
        this.setData({
          tapType: 'rotate'
        })
      } else {
        this.setData({
          tapType: 'move'
        })
      }
      config.current = [current.posX, current.posY]
    }
  },
  onTouchMove(e) {
    const { current, tapType, canvasWidth } = this.data
    const { touches, target } = e
    if (current && touches.length === 1) {
      if (tapType === 'move') {
        current.posX = config.current[0] + touches[0].clientX - config.moveInfo.startX
        current.posY = config.current[1] + touches[0].clientY - config.moveInfo.startY
        this.drawImageCanvas(false)
      } else {
        const { posX, posY, width, height } = current
        const middle = {
          x: posX + width / 2,
          y: posY + height / 2
        }

        const horizontalDis = touches[0].clientX - target.offsetLeft - middle.x
        const verticalDis = touches[0].clientY - target.offsetTop - middle.y
        const distance = Math.sqrt((horizontalDis * horizontalDis) + (verticalDis * verticalDis))
        const newWidth = ornamentWidth * distance / current.dist
        const w = newWidth > - 10 ? newWidth : 10
        current.width = w
        current.height = w * current.scale
        current.posX = posX - (w - width) / 2
        current.posY = posY - (w * current.scale - height) / 2
        if (horizontalDis === 0) {
          if (verticalDis > 0) {
            current.rotate = 45 * Math.PI / 180
          } else {
            current.rotate = -135 * Math.PI / 180
          }
        } else {
          const k = verticalDis / horizontalDis
          const rotate = Math.atan(Math.abs((k - 1) / (1 + k)))
          if (verticalDis  > 0 && (k <= -1 || k >= 1)) {
            current.rotate = rotate
          }

          if (verticalDis <= 0 && (k <= -1 || k >= 1)) {
            current.rotate =  Math.PI + rotate
          }

          if (horizontalDis > 0 && (k > -1 && k < 1)) {
            current.rotate = -rotate
          }
          
          if (horizontalDis < 0 && (k > -1 && k < 1)) {
            current.rotate = Math.PI - rotate
          }
        }
        
        this.drawImageCanvas(false)
      }
    }
  },
  drawImageCanvas(isSave) {
    const { ctx, selectTemplate, selectOrnaments } = this.data
    const elements = [config.image]
    if (selectTemplate.path) {
      elements.push(selectTemplate)
    }
    this.drawImage(ctx, [...elements])
    this.drawDashRect(ctx, selectOrnaments, isSave)
    ctx.draw()
  },
  drawImage(ctx, elements) {
    elements.forEach(ele => {
      const { path, posX, posY, width, height } = ele
      ctx.drawImage(path, posX, posY, width, height)
    })
  },
  drawDashRect(ctx, elements, isSave) {
    elements.forEach(ele => {
      const { path, posX, posY, width, height, rotate } = ele
      console.log('ornament =>', path)
      const middle = {
        x: posX + width / 2,
        y: posY + height / 2
      }
      ctx.translate(middle.x, middle.y)
      ctx.rotate(rotate)

      ctx.drawImage(path, -width / 2, -height / 2, width, height)

      if (!isSave) {
        ctx.setStrokeStyle('#fff')
        ctx.setLineWidth(2)
        ctx.setLineDash([10, 5], 0)
        ctx.strokeRect(-width / 2, -height / 2, width, height)
        ctx.setLineDash([10, 0], 0)

        // 画关闭图标
        ctx.setFillStyle('red')
        ctx.translate(-width / 2, -height / 2)
        ctx.beginPath() // 画底圆
        ctx.arc(0, 0, 8, 0, 2 * Math.PI)
        ctx.closePath()
        ctx.fill()
        ctx.setLineDash([10, 0])
        // 画叉
        ctx.rotate(45 * Math.PI / 180)
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(5, 0)
        ctx.closePath()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, -5)
        ctx.lineTo(0, 5)
        ctx.closePath()
        ctx.stroke()
        ctx.rotate(-45 * Math.PI / 180)
        ctx.translate(width / 2, height / 2)

        // 画缩放旋转图标
        ctx.translate(width / 2, height / 2)
        ctx.beginPath() // 画底圆
        ctx.arc(0, 0, 8, 0, 2 * Math.PI)
        ctx.closePath()
        ctx.fill()
        // 画圆弧箭头
        ctx.setLineWidth(1)
        ctx.rotate(-30 * Math.PI / 180)
        ctx.beginPath() // 画弧线
        ctx.arc(0, 0, 5, 0, 300 * Math.PI / 180)
        ctx.stroke()
        ctx.closePath()
        ctx.translate(5, 0) // 画箭头
        ctx.rotate(15 * Math.PI / 180)
        ctx.beginPath()
        ctx.moveTo(-2, 2)
        ctx.lineTo(0, 0)
        ctx.lineTo(2, 2)
        ctx.stroke()
        ctx.closePath()
        ctx.rotate(-15 * Math.PI / 180)
        ctx.translate(-5, 0)
        ctx.rotate(30 * Math.PI / 180)
        ctx.translate(-width / 2, -height / 2)
      }
      
      ctx.rotate(-rotate)
      ctx.translate(-middle.x, -middle.y)
    })
  },
  isClose(x, y) {
    const inX = x <= 10 && x >= -10
    const inY = y <= 10 && y >= -10

    return inX && inY
  },
  isRotate(x, y, width, height) {
    const inX = x <= (width + 10) && x >= (width - 10)
    const inY = y <= (height + 10) && y >= (height - 10)

    return inX && inY
  },
  onSave() {
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          this.reAuth()
        } else {
          this.saveImage()
        }
      }
    })
  },
  reAuth() {
    wx.showToast({
      title: '保存图片需要您的授权',
      icon: 'none',
      success: () => {
        wx.showActionSheet({
          itemList: ['去设置'],
          success: () => {
            wx.openSetting()
          }
        })
      }
    })
  },
  saveImage() {
    this.drawImageCanvas(true)
    const { canvasWidth } = this.data
    wx.canvasToTempFilePath({
      fileType: 'jpg',
      quality: 1,
      canvasId: 'canvas',
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({
              title: '保存成功'
            })
          },
          fail: () => {
            wx.showToast({
              title: '保存失败,请重试',
              icon: 'none'
            })
          },
          complete: () =>{
            this.drawImageCanvas(false)
          }
        })
      }
    })
  },
  getSwiperItems() {
    this.getTemplates()
      .then(templates => {
        this.setUrl(templates, 'templates')
      })
    this.getOrnaments()
      .then(ornaments => {
        this.setUrl(ornaments, 'ornaments')
      })
  },
  setUrl(list, collection) {
    const urlList = list.map(item => item.url)
    Promise.all(urlList.map(url => new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: url,
        success: res => {
          resolve({ url: res.path })
        },
        fail: err => {
          console.error(err)
          reject(err)
        }
      })
    }))).then(trueList => {
      this.setData({
        [collection]: {
          showItem: trueList.length > 6 ? 6 : trueList.length,
          list: trueList
        }
      })
    })
  },
  getTemplates() {
    return this.getData('template')
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
        while(index < count) {
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
  },
  uploadTemplate() {
    wx.navigateTo({
      url: '/pages/upload/upload?type=template',
    })
  },
  uploadOrnament() {
    wx.navigateTo({
      url: '/pages/upload/upload?type=ornament',
    })
  }
})
