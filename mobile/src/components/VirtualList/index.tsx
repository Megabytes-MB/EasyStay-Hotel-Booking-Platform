import React, { useMemo, useState } from 'react'
import { ScrollView, View } from '@tarojs/components'
import { designPxToDevicePx, getDeviceWindowWidth } from '../../utils/layout'

interface Props<T> {
  data: T[]
  itemHeight: number
  height: number
  onReachBottom?: () => void
  onRefresh?: () => void
  refreshing?: boolean
  renderItem: (item: T, index: number) => React.ReactNode
}

const VirtualList = <T,>({
  data,
  itemHeight,
  height,
  onReachBottom,
  onRefresh,
  refreshing,
  renderItem
}: Props<T>) => {
  const [windowWidth] = useState(() => getDeviceWindowWidth())
  const rowHeight = Math.max(1, designPxToDevicePx(itemHeight, windowWidth))
  const containerHeight = Math.max(1, designPxToDevicePx(height, windowWidth))
  const [scrollTop, setScrollTop] = useState(0)
  const totalHeight = data.length * rowHeight
  const visibleCount = Math.ceil(containerHeight / rowHeight) + 2
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 1)
  const endIndex = Math.min(data.length, startIndex + visibleCount)

  const visibleItems = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  )

  return (
    <ScrollView
      scrollY
      style={{ height: `${containerHeight}px` }}
      onScroll={e => setScrollTop(e.detail.scrollTop)}
      onScrollToLower={onReachBottom}
      lowerThreshold={60}
      refresherEnabled={Boolean(onRefresh)}
      refresherTriggered={Boolean(refreshing)}
      onRefresherRefresh={() => onRefresh?.()}
    >
      <View style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <View style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
          {visibleItems.map((item, idx) => (
            <View key={startIndex + idx} style={{ height: `${rowHeight}px` }}>
              {renderItem(item, startIndex + idx)}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

export default VirtualList
