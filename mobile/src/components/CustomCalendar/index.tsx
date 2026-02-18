import React, { useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import dayjs from 'dayjs'
import './index.scss'

interface Props {
  visible: boolean
  onConfirm: (start: string, end: string, days: number) => void
  onClose: () => void
  initialStartDate?: string
  initialEndDate?: string
  monthsToShow?: number
  minDate?: string
}

interface DayCell {
  value: string
  day: number
  disabled: boolean
}

interface MonthOption {
  offset: number
  label: string
}

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const CustomCalendar: React.FC<Props> = ({
  visible,
  onConfirm,
  onClose,
  initialStartDate = '',
  initialEndDate = '',
  monthsToShow = 12,
  minDate,
}) => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthOffset, setMonthOffset] = useState(0)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  const minSelectableDate = useMemo(() => {
    if (!minDate) return dayjs().startOf('day')
    const parsed = dayjs(minDate)
    return parsed.isValid() ? parsed.startOf('day') : dayjs().startOf('day')
  }, [minDate])

  const maxMonthCount = Math.max(1, monthsToShow)
  const minMonth = useMemo(() => minSelectableDate.startOf('month'), [minSelectableDate])
  const currentMonth = useMemo(() => minMonth.add(monthOffset, 'month'), [minMonth, monthOffset])

  const monthDays = useMemo<DayCell[]>(() => {
    const total = currentMonth.daysInMonth()
    return Array.from({ length: total }).map((_, dayIndex) => {
      const current = currentMonth.date(dayIndex + 1)
      return {
        value: current.format('YYYY-MM-DD'),
        day: current.date(),
        disabled: current.isBefore(minSelectableDate, 'day'),
      }
    })
  }, [currentMonth, minSelectableDate])

  const monthEmptyCount = currentMonth.day()
  const monthLabel = currentMonth.format('YYYY年MM月')
  const monthOptions = useMemo<MonthOption[]>(
    () =>
      Array.from({ length: maxMonthCount }).map((_, index) => ({
        offset: index,
        label: minMonth.add(index, 'month').format('YYYY年MM月'),
      })),
    [maxMonthCount, minMonth]
  )

  useEffect(() => {
    if (!visible) return

    setStartDate(initialStartDate)
    setEndDate(initialEndDate)
    setShowMonthPicker(false)

    const initial = dayjs(initialStartDate)
    if (!initial.isValid()) {
      setMonthOffset(0)
      return
    }

    const initialMonth = initial.startOf('month')
    if (initialMonth.isBefore(minMonth, 'month')) {
      setMonthOffset(0)
      return
    }

    const diff = initialMonth.diff(minMonth, 'month')
    const clamped = Math.max(0, Math.min(diff, maxMonthCount - 1))
    setMonthOffset(clamped)
  }, [visible, initialStartDate, initialEndDate, minMonth, maxMonthCount])

  const handleSelect = (value: string, disabled: boolean) => {
    if (disabled) return

    if (!startDate || (startDate && endDate)) {
      setStartDate(value)
      setEndDate('')
      return
    }

    if (
      dayjs(value).isSame(dayjs(startDate), 'day') ||
      dayjs(value).isBefore(dayjs(startDate), 'day')
    ) {
      setStartDate(value)
      setEndDate('')
      return
    }

    setEndDate(value)
  }

  const stayNights = useMemo(() => {
    if (!startDate || !endDate) return 0
    return dayjs(endDate).diff(dayjs(startDate), 'day')
  }, [startDate, endDate])

  const canConfirm = stayNights > 0

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(startDate, endDate, stayNights)
  }

  const jumpToMonth = (offset: number) => {
    setMonthOffset(offset)
    setShowMonthPicker(false)
  }

  const canGoPrev = monthOffset > 0
  const canGoNext = monthOffset < maxMonthCount - 1

  if (!visible) return null

  return (
    <View className='calendar-mask' onClick={onClose}>
      <View className='calendar-modal' onClick={e => e.stopPropagation()}>
        <View className='header'>请选择入住/离店日期</View>

        {!showMonthPicker && (
          <View className='week-row'>
            {WEEK_LABELS.map(label => (
              <Text key={label} className='week-item'>
                {label}
              </Text>
            ))}
          </View>
        )}

        <View className='month-nav'>
          <View
            className={`month-arrow ${canGoPrev ? '' : 'disabled'}`}
            onClick={
              canGoPrev
                ? () => {
                    setMonthOffset(prev => prev - 1)
                    setShowMonthPicker(false)
                  }
                : undefined
            }
          >
            ‹
          </View>
          <View className='month-title-wrap' onClick={() => setShowMonthPicker(prev => !prev)}>
            <Text className='month-title'>{monthLabel}</Text>
            <Text className={`month-caret ${showMonthPicker ? 'open' : ''}`}>▾</Text>
          </View>
          <View
            className={`month-arrow ${canGoNext ? '' : 'disabled'}`}
            onClick={
              canGoNext
                ? () => {
                    setMonthOffset(prev => prev + 1)
                    setShowMonthPicker(false)
                  }
                : undefined
            }
          >
            ›
          </View>
        </View>

        {showMonthPicker ? (
          <View className='month-picker'>
            <ScrollView scrollY className='month-picker-scroll'>
              <View className='month-picker-grid'>
                {monthOptions.map(option => (
                  <View
                    key={option.label}
                    className={`month-option ${option.offset === monthOffset ? 'active' : ''}`}
                    onClick={() => jumpToMonth(option.offset)}
                  >
                    {option.label}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View className='days-grid'>
            {Array.from({ length: monthEmptyCount }).map((_, index) => (
              <View key={`blank-${index}`} className='day-item empty' />
            ))}

            {monthDays.map(day => {
              const isStart = day.value === startDate
              const isEnd = day.value === endDate
              const inRange =
                !!startDate &&
                !!endDate &&
                dayjs(day.value).isAfter(dayjs(startDate), 'day') &&
                dayjs(day.value).isBefore(dayjs(endDate), 'day')

              const classNames = ['day-item']
              if (day.disabled) classNames.push('disabled')
              if (inRange) classNames.push('range')
              if (isStart) classNames.push('start')
              if (isEnd) classNames.push('end')
              if (isStart || isEnd) classNames.push('selected')

              return (
                <View
                  key={day.value}
                  className={classNames.join(' ')}
                  onClick={() => handleSelect(day.value, day.disabled)}
                >
                  <Text>{day.day}</Text>
                </View>
              )
            })}
          </View>
        )}

        <View className='summary'>
          {canConfirm
            ? `${startDate} 至 ${endDate}，共 ${stayNights} 晚`
            : startDate
              ? `已选入住：${startDate}，请选择离店日期`
              : '请选择入住和离店日期'}
        </View>

        <View className='footer'>
          <View className='ghost' onClick={onClose}>
            取消
          </View>
          <View
            className={`primary ${canConfirm ? '' : 'disabled'}`}
            onClick={canConfirm ? handleConfirm : undefined}
          >
            确认选择
          </View>
        </View>
      </View>
    </View>
  )
}

export default CustomCalendar
