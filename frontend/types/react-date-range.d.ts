declare module 'react-date-range' {
  import type { ComponentType } from 'react'

  export interface Range {
    startDate: Date
    endDate: Date
    key?: string
  }

  export interface DateRangePickerProps {
    ranges?: Range[]
    onChange?: (ranges: Record<string, Range>) => void
    months?: number
    direction?: 'horizontal' | 'vertical'
    rangeColors?: string[]
    showMonthAndYearPickers?: boolean
    className?: string
  }

  export const DateRangePicker: ComponentType<DateRangePickerProps>
}
