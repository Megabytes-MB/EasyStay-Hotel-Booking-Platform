import dayjs from 'dayjs'

interface HolidayPeriod {
  name: string
  start: string
  end?: string
}

export interface HolidayRule {
  id?: number
  name: string
  startDate: string
  endDate: string
  discountRate?: number
  isActive?: boolean
  holidayType?: 'official' | 'custom' | 'campaign' | string
}

interface StayPriceParams {
  startDate: string
  endDate: string
  basePrice: number
}

export interface StayPriceWithHolidayDiscount {
  originalPrice: number
  totalPrice: number
  discountAmount: number
  holidayNights: number
  holidayNames: string[]
  appliedDiscountRates: number[]
}

/**
 * 节假日折扣系数：0.9 = 节假日 9 折。
 */
export const HOLIDAY_DISCOUNT_RATE = 0.9

/**
 * 固定公历节假日（每年相同）。
 */
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '05-01': '劳动节',
  '10-01': '国庆节',
}

/**
 * 可按年份扩展的节假日表（含农历节日对应的公历日期）。
 * start/end 均为 YYYY-MM-DD，end 省略时表示单日。
 */
const HOLIDAY_PERIODS: HolidayPeriod[] = [
  { name: '春节', start: '2025-01-29', end: '2025-02-04' },
  { name: '清明节', start: '2025-04-04', end: '2025-04-06' },
  { name: '端午节', start: '2025-05-31', end: '2025-06-02' },
  { name: '中秋节', start: '2025-10-06' },

  { name: '春节', start: '2026-02-17', end: '2026-02-23' },
  { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
  { name: '端午节', start: '2026-06-19', end: '2026-06-21' },
  { name: '中秋节', start: '2026-09-25' },

  { name: '春节', start: '2027-02-06', end: '2027-02-12' },
]

const PERIOD_RULES_FALLBACK: HolidayRule[] = HOLIDAY_PERIODS.map(item => ({
  name: item.name,
  startDate: item.start,
  endDate: item.end || item.start,
  discountRate: HOLIDAY_DISCOUNT_RATE,
  isActive: true,
  holidayType: 'official',
}))

let dynamicHolidayRules: HolidayRule[] = []

const isDateInRange = (date: string, start: string, end: string) => {
  const target = dayjs(date)
  const startDay = dayjs(start)
  const endDay = dayjs(end)
  return (
    target.isSame(startDay, 'day') ||
    target.isSame(endDay, 'day') ||
    (target.isAfter(startDay, 'day') && target.isBefore(endDay, 'day'))
  )
}

const normalizeRule = (item: HolidayRule): HolidayRule | null => {
  const startDate = dayjs(item.startDate).isValid() ? dayjs(item.startDate).format('YYYY-MM-DD') : ''
  const endDateSource = item.endDate || item.startDate
  const endDate = dayjs(endDateSource).isValid() ? dayjs(endDateSource).format('YYYY-MM-DD') : ''
  if (!startDate || !endDate || endDate < startDate) return null

  const discountRate = Number(item.discountRate)
  return {
    id: item.id,
    name: item.name,
    holidayType: item.holidayType || 'custom',
    isActive: item.isActive !== false,
    startDate,
    endDate,
    discountRate:
      Number.isFinite(discountRate) && discountRate > 0 && discountRate <= 1
        ? discountRate
        : HOLIDAY_DISCOUNT_RATE,
  }
}

export const setHolidayRules = (rules: HolidayRule[]) => {
  if (!Array.isArray(rules)) {
    dynamicHolidayRules = []
    return
  }
  dynamicHolidayRules = rules
    .map(normalizeRule)
    .filter((item): item is HolidayRule => !!item && item.isActive !== false)
}

const getMatchedDynamicRule = (date: string): HolidayRule | null => {
  if (dynamicHolidayRules.length === 0) return null

  const matched = dynamicHolidayRules.filter(rule => isDateInRange(date, rule.startDate, rule.endDate))
  if (matched.length === 0) return null

  return matched.sort((a, b) => {
    const rateA = Number(a.discountRate ?? HOLIDAY_DISCOUNT_RATE)
    const rateB = Number(b.discountRate ?? HOLIDAY_DISCOUNT_RATE)
    return rateA - rateB
  })[0]
}

const getFallbackRule = (date: string): HolidayRule | null => {
  const matchedPeriodRule = PERIOD_RULES_FALLBACK.find(rule =>
    isDateInRange(date, rule.startDate, rule.endDate)
  )
  if (matchedPeriodRule) return matchedPeriodRule

  const fixedHoliday = FIXED_HOLIDAYS[dayjs(date).format('MM-DD')]
  if (!fixedHoliday) return null

  return {
    name: fixedHoliday,
    startDate: date,
    endDate: date,
    discountRate: HOLIDAY_DISCOUNT_RATE,
    isActive: true,
    holidayType: 'official',
  }
}

const getHolidayRuleForDate = (date: string): HolidayRule | null => {
  const matchedDynamicRule = getMatchedDynamicRule(date)
  if (matchedDynamicRule) return matchedDynamicRule
  return getFallbackRule(date)
}

export const getHolidayName = (date: string): string => {
  if (!dayjs(date).isValid()) return ''
  const matchedRule = getHolidayRuleForDate(date)
  return matchedRule?.name || ''
}

export const calculateStayPriceWithHolidayDiscount = ({
  startDate,
  endDate,
  basePrice,
}: StayPriceParams): StayPriceWithHolidayDiscount => {
  const checkIn = dayjs(startDate).startOf('day')
  const checkOut = dayjs(endDate).startOf('day')
  const nightlyPrice = Number(basePrice) || 0

  if (!checkIn.isValid() || !checkOut.isValid() || !checkIn.isBefore(checkOut, 'day')) {
    return {
      originalPrice: 0,
      totalPrice: 0,
      discountAmount: 0,
      holidayNights: 0,
      holidayNames: [],
      appliedDiscountRates: [],
    }
  }

  let cursor = checkIn
  let originalPrice = 0
  let totalPrice = 0
  let holidayNights = 0
  const holidayNames = new Set<string>()
  const appliedDiscountRates = new Set<number>()

  while (cursor.isBefore(checkOut, 'day')) {
    const dayText = cursor.format('YYYY-MM-DD')
    const holidayRule = getHolidayRuleForDate(dayText)
    const holidayName = holidayRule?.name || ''
    const discountRate = Number(holidayRule?.discountRate || 1)

    originalPrice += nightlyPrice

    if (holidayName) {
      totalPrice += nightlyPrice * discountRate
      holidayNights += 1
      holidayNames.add(holidayName)
      if (discountRate < 1) {
        appliedDiscountRates.add(discountRate)
      }
    } else {
      totalPrice += nightlyPrice
    }

    cursor = cursor.add(1, 'day')
  }

  const roundedOriginal = Number(originalPrice.toFixed(2))
  const roundedTotal = Number(totalPrice.toFixed(2))

  return {
    originalPrice: roundedOriginal,
    totalPrice: roundedTotal,
    discountAmount: Number((roundedOriginal - roundedTotal).toFixed(2)),
    holidayNights,
    holidayNames: Array.from(holidayNames),
    appliedDiscountRates: Array.from(appliedDiscountRates).sort((a, b) => a - b),
  }
}
