import React, { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import dayjs from 'dayjs'
import './index.scss'

interface Props {
  visible: boolean
  onConfirm: (start: string, end: string, days: number) => void
  onClose: () => void
}

const CustomCalendar: React.FC<Props> = ({ visible, onConfirm, onClose }) => {
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const daysInMonth = useMemo(() => {
    const now = dayjs()
    const total = now.daysInMonth()
    return Array.from({ length: total }).map((_, i) => now.date(i + 1))
  }, [])

  const handleSelect = (value: string) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(value)
      setEndDate('')
      return
    }
    if (dayjs(value).isBefore(dayjs(startDate), 'day')) {
      setStartDate(value)
      setEndDate('')
      return
    }
    setEndDate(value)
  }

  const handleConfirm = () => {
    if (!startDate || !endDate) return
    const days = dayjs(endDate).diff(dayjs(startDate), 'day')
    onConfirm(startDate, endDate, days)
  }

  if (!visible) return null

  return (
    <View className="calendar-mask" onClick={onClose}>
      <View className="calendar-modal" onClick={e => e.stopPropagation()}>
        <View className="header">请选择入住/离店日期</View>
        <View className="days-grid">
          {daysInMonth.map(d => {
            const value = d.format('YYYY-MM-DD')
            const selected = value === startDate || value === endDate
            const inRange =
              startDate &&
              endDate &&
              dayjs(value).isAfter(dayjs(startDate), 'day') &&
              dayjs(value).isBefore(dayjs(endDate), 'day')
            return (
              <View
                key={value}
                className={`day-item ${selected ? 'selected' : ''} ${
                  inRange ? 'range' : ''
                }`}
                onClick={() => handleSelect(value)}
              >
                <Text>{d.date()}</Text>
              </View>
            )
          })}
        </View>
        <View className="footer">
          <View className="ghost" onClick={onClose}>
            取消
          </View>
          <View className="primary" onClick={handleConfirm}>
            确认选择
          </View>
        </View>
      </View>
    </View>
  )
}

export default CustomCalendar
