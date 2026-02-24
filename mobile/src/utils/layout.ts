import Taro from '@tarojs/taro'

const DESIGN_WIDTH = 750

export const getDeviceWindowWidth = () => {
  const systemInfo = Taro.getSystemInfoSync()
  const windowWidth = Number(systemInfo?.windowWidth)
  if (Number.isFinite(windowWidth) && windowWidth > 0) {
    return windowWidth
  }
  return DESIGN_WIDTH
}

export const designPxToDevicePx = (designPx: number, windowWidth = getDeviceWindowWidth()) =>
  (designPx * windowWidth) / DESIGN_WIDTH
