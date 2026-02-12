import type { UserConfigExport } from '@tarojs/cli'
import baseConfig from './index'

const config: UserConfigExport = {
  ...baseConfig,
  defineConstants: {
    ...(baseConfig.defineConstants || {}),
    __DEV__: JSON.stringify(true)
  }
}

export default config
