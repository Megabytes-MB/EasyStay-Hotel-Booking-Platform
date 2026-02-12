import React, { useMemo, useState } from 'react'
import { ScrollView, View } from '@tarojs/components'

interface Props<T> {
  data: T[]
  itemHeight: number
  height: number
  onReachBottom?: () => void
  renderItem: (item: T, index: number) => React.ReactNode
}

const VirtualList = <T,>({
  data,
  itemHeight,
  height,
  onReachBottom,
  renderItem
}: Props<T>) => {
  const [scrollTop, setScrollTop] = useState(0)
  const totalHeight = data.length * itemHeight
  const visibleCount = Math.ceil(height / itemHeight) + 2
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 1)
  const endIndex = Math.min(data.length, startIndex + visibleCount)

  const visibleItems = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  )

  return (
    <ScrollView
      scrollY
      style={{ height: `${height}px` }}
      onScroll={e => setScrollTop(e.detail.scrollTop)}
      onScrollToLower={onReachBottom}
      lowerThreshold={60}
    >
      <View style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <View style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map((item, idx) => (
            <View key={startIndex + idx} style={{ height: `${itemHeight}px` }}>
              {renderItem(item, startIndex + idx)}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

export default VirtualList
