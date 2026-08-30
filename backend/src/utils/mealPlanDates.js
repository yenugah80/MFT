export const assignMealPlanDates = (days, startDate, limit = 7) => {
  const planStart = new Date(`${startDate}T12:00:00.000Z`);
  return days.slice(0, limit).map((day, index) => {
    const calendarDate = new Date(planStart);
    calendarDate.setUTCDate(calendarDate.getUTCDate() + index);
    return {
      ...day,
      day: index + 1,
      date: calendarDate.toISOString().slice(0, 10),
      date_label: calendarDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    };
  });
};
