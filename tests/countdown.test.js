const { calculateTargetDate, getRemainingSeconds, formatTime } = require('../countdown')

describe('formatTime', () => {
  test('formats 125 seconds as 02:05', () => {
    expect(formatTime(125)).toBe('02:05')
  })

  test('formats 3600 seconds as 01:00:00', () => {
    expect(formatTime(3600)).toBe('01:00:00')
  })

  test('formats 3661 seconds as 01:01:01', () => {
    expect(formatTime(3661)).toBe('01:01:01')
  })

  test('formats 59 seconds as 00:59', () => {
    expect(formatTime(59)).toBe('00:59')
  })

  test('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  test('formats negative seconds as 00:00', () => {
    expect(formatTime(-10)).toBe('00:00')
  })
})

describe('calculateTargetDate — minutes mode', () => {
  test('returns a Date approximately N minutes from now', () => {
    const before = Date.now()
    const target = calculateTargetDate('minutes', 15, null)
    const after = Date.now()
    expect(target.getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000)
    expect(target.getTime()).toBeLessThanOrEqual(after + 15 * 60 * 1000)
  })

  test('returns a Date approximately 1 minute from now when minutes=1', () => {
    const before = Date.now()
    const target = calculateTargetDate('minutes', 1, null)
    expect(target.getTime() - before).toBeCloseTo(60 * 1000, -2)
  })
})

describe('calculateTargetDate — time mode', () => {
  test('sets correct hours and minutes from HH:MM string', () => {
    const target = calculateTargetDate('time', null, '14:30')
    expect(target.getHours()).toBe(14)
    expect(target.getMinutes()).toBe(30)
    expect(target.getSeconds()).toBe(0)
    expect(target.getMilliseconds()).toBe(0)
  })

  test('handles 00:00 as midnight', () => {
    const target = calculateTargetDate('time', null, '00:00')
    expect(target.getHours()).toBe(0)
    expect(target.getMinutes()).toBe(0)
  })
})

describe('getRemainingSeconds', () => {
  test('returns 0 for a past date', () => {
    const past = new Date(Date.now() - 5000)
    expect(getRemainingSeconds(past)).toBe(0)
  })

  test('returns approximately correct seconds for a future date', () => {
    const future = new Date(Date.now() + 10000)
    const remaining = getRemainingSeconds(future)
    expect(remaining).toBeGreaterThanOrEqual(9)
    expect(remaining).toBeLessThanOrEqual(10)
  })

  test('returns 0 or 1 for a date that is now', () => {
    const now = new Date()
    expect(getRemainingSeconds(now)).toBeLessThanOrEqual(1)
  })
})
