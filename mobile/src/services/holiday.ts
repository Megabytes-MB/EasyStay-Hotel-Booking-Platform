import { get } from '../utils/request'
import { API_PATHS } from '../config/api'
import { HolidayRule, setHolidayRules } from '../utils/holiday'

interface FetchHolidayParams {
  startDate?: string
  endDate?: string
}

export const fetchHolidayRules = async (params?: FetchHolidayParams) => {
  return get<HolidayRule[]>(API_PATHS.HOLIDAYS, params, {
    showLoading: false,
  })
}

export const loadHolidayRulesToCache = async (params?: FetchHolidayParams) => {
  try {
    const response = await fetchHolidayRules(params)
    if (response.code === 200 && Array.isArray(response.data)) {
      setHolidayRules(response.data)
      return true
    }
    return false
  } catch (error) {
    console.error('loadHolidayRulesToCache error:', error)
    return false
  }
}

export default {
  fetchHolidayRules,
  loadHolidayRulesToCache,
}

