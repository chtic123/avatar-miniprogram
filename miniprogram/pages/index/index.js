//index.js
const app = getApp()
const config = {
  image: {},
  isScale: false,
  moveInfo: {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  },
  scaleInfo: {
    initDis: 0,
    endDis: 0,
    point:[0, 0],
    times: 1
  }
}
let times = 1

Page({
  onLoad() {
    this.setData({
      imgUrl: app.globalData.userInfo.avatarUrl.replace('/132', '/0'),
      ctx: wx.createCanvasContext('canvas'),
      canvasWidth: app.globalData.sysInfo.windowWidth * 0.9
    })

    this.onDrawImage()
  },
  data: {
    imgUrl: '',
    ctx: {},
    canvasWidth: 0,
    startTime: Date.now()
  },
  onUpload() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const imgUrl = res.tempFilePaths[0]
        this.setData({
          imgUrl
        })
        this.onDrawImage()
      }
    })
  },
  onDrawImage() {
    const { ctx, canvasWidth } = this.data

    wx.showLoading({
      title: '加载中',
      mask: true
    })
    wx.getImageInfo({
      src: this.data.imgUrl,
      success: res => {
        const { width, height } = res
        let imgWidth, imgHeight, posX, posY
        if (width > height) {
          imgHeight = canvasWidth
          imgWidth = (imgHeight * width) / height
          posY = 0
          posX = (canvasWidth - imgWidth) / 2
        } else {
          imgWidth = canvasWidth
          imgHeight = (imgWidth * height) / width
          posY = (canvasWidth - imgHeight) / 2
          posX = 0
        }

        config.image = {
          path: res.path,
          posX,
          posY,
          width: imgWidth,
          height: imgHeight
        }

        this.drawImage(ctx, [config.image])

        ctx.draw()
        wx.hideLoading()
      }
    })
  },
  onTouchStart(e) {
    if (e.touches.length === 2) {
      this.scaleStart(e)
    } else if (e.touches.length === 1) {
      this.moveStart(e)
    }
  },
  onTouchMove(e) {
    if (e.touches.length === 2) {
      this.scale(e)
    } else if (e.touches.length === 1) {
      this.move(e)
    }
  },
  onTouchEnd(e) {
    if (e.touches.length === 0) {
      if (config.isScale) {
        this.scaleEnd()
      } else {
        this.moveEnd()
      }
    }
  },
  moveStart(e) {
    const { touches: [touch] } = e
    config.moveInfo.startX = touch.clientX
    config.moveInfo.startY = touch.clientY
  },
  move(e) {
    const { ctx } = this.data
    const { touches: [touch] } = e
    config.moveInfo.endX = config.image.posX + touch.clientX - config.moveInfo.startX
    config.moveInfo.endY = config.image.posY + touch.clientY - config.moveInfo.startY
    this.drawImage(ctx, [{ ...config.image, posX: config.moveInfo.endX, posY: config.moveInfo.endY }])

    ctx.draw()
  },
  moveEnd() {
    const { ctx, canvasWidth } = this.data
    const { moveInfo, image } = config

    if (moveInfo.endX > 0) {
      config.image.posX = 0
    } else if (moveInfo.endX < (canvasWidth - image.width)) {
      config.image.posX = canvasWidth - image.width
    } else {
      config.image.posX = config.moveInfo.endX
    }

    if (moveInfo.endY > 0) {
      config.image.posY = 0
    } else if (moveInfo.endY < (canvasWidth - image.height)) {
      config.image.posY = canvasWidth - image.height
    } else {
      config.image.posY = config.moveInfo.endY
    }

    this.drawImage(ctx, [config.image])

    ctx.draw()
  },
  scaleStart(e) {
    const { target, touches: [point1, point2] } = e
    const horizontalDis = point1.clientX - point2.clientX
    const verticalDis = point1.clientY - point2.clientY
    config.scaleInfo.initDis = Math.sqrt((horizontalDis * horizontalDis) + (verticalDis * verticalDis))
    config.scaleInfo.point = [
      ((point1.clientX + point2.clientX) / 2) - target.offsetLeft,
      ((point1.clientY + point2.clientY) / 2) - target.offsetTop
    ]
  },
  scale(e) {
    config.isScale = true
    const { ctx } = this.data
    const { touches: [point1, point2] } = e
    const horizontalDis = point1.clientX - point2.clientX
    const verticalDis = point1.clientY - point2.clientY
    const { width, height, posX, posY, path } = config.image
    config.scaleInfo.endDis = Math.sqrt((horizontalDis * horizontalDis) + (verticalDis * verticalDis))
    times = 1 + 0.005 * (config.scaleInfo.endDis - config.scaleInfo.initDis)
    const newWidth = width * times
    const newHeight = height * times
    const newX = posX - (config.scaleInfo.point[0] - posX) * (times - 1)
    const newY = posY - (config.scaleInfo.point[1] - posY) * (times - 1)
    this.drawImage(ctx, [{ path, posX: newX, posY: newY, width: newWidth, height: newHeight }])

    ctx.draw()
  },
  scaleEnd() {
    const { ctx, canvasWidth } = this.data
    const { width, height, posX, posY, path } = config.image
    const { moveInfo } = config
    let newWidth = width * times
    let newHeight = height * times
    let newX = posX - (config.scaleInfo.point[0] - posX) * (times - 1)
    let newY = posY - (config.scaleInfo.point[1] - posY) * (times - 1)
    moveInfo.endX = newX
    moveInfo.endY = newY

    if (newWidth > newHeight) {
      if (newHeight < canvasWidth) {
        newHeight = canvasWidth
        newWidth = (newHeight * width) / height
      }
    } else {
      if (newWidth < canvasWidth) {
        newWidth = canvasWidth
        newHeight = (newWidth * height) / width
      }
    }

    config.image = {
      path,
      posX: newX,
      posY: newY,
      width: newWidth,
      height: newHeight
    }

    this.drawImage(ctx, [config.image])

    ctx.draw()
    config.isScale = false
    this.moveEnd()
  },
  drawImage(ctx, elements) {
    elements.forEach(ele => {
      const { type, path, posX, posY, width, height } = ele
      ctx.drawImage(path, posX, posY, width, height)
    })
  },
  onBegin() {
    app.globalData.imageInfo = config.image
    wx.navigateTo({
      url: '/pages/editor/editor'
    })
  }
})
