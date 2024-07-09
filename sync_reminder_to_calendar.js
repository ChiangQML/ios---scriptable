// 定义同步的时间段，当前时间前后n个月 
// Define the time period for synchronization, n months before and after the current time 
const durMonth = 2; 

// 获取开始和结束日期 
// Get start date and end date
const calculateSyncPeriod = (months) => { 
  const now = new Date(); 
  const startDate = new Date(now); 
  startDate.setMonth(now.getMonth() - months); 
  const endDate = new Date(now); 
  endDate.setMonth(now.getMonth() + months); 
  return { startDate, endDate }; 
}; 

const { startDate, endDate } = calculateSyncPeriod(durMonth); 
console.log(`日历的开始时间 ${startDate.toLocaleDateString()}`); 
console.log(`日历的结束时间 ${endDate.toLocaleDateString()}`); 

// 获取提醒事项和日历事件 
// Get reminders and calendar events
const reminders = await Reminder.allDueBetween(startDate, endDate); 
console.log(`获取 ${reminders.length} 条提醒事项`); 
const calendars = await Calendar.forEvents(); 
const calendarMap = new Map(calendars.map(cal => [cal.title, cal])); 
const events = await CalendarEvent.between(startDate, endDate, calendars); 
console.log(`获取 ${events.length} 条日历`); 

// 设置时间段描述 
// Set the time period description 
const setPeriodDescription = (period, description) => { 
  const supplement = description === "延期" || description === "提前" ? "完成" : ""; 
  const hours = Math.floor(period / 3600); 
  const minutes = Math.floor((period % 3600) / 60); 
  const days = Math.floor(period / 86400); 
  if (period < 3600) { 
    return minutes === 0 ? `准时完成` : `${description}${minutes}分钟${supplement}`; 
  } else if (period < 86400) { 
    return minutes === 0 ? `${description}${hours}小时${supplement}` : `${description}${hours}小时${minutes}分钟${supplement}`; 
  } else { 
    return minutes === 0 ? `${description}${days}天${supplement}` : `${description}${days}天${hours}小时${supplement}`; 
  } 
}; 

// 更新日历事件 
// Update calendar events 
const updateEvent = (event, reminder) => { 
  const calendar = calendarMap.get(reminder.calendar.title); 
  event.calendar = calendar; 
  if (reminder.isCompleted) { 
    event.isAllDay = false; 
    const startDate = reminder.dueDate < reminder.completionDate ? reminder.dueDate : reminder.completionDate; 
    const endDate = reminder.dueDate > reminder.completionDate ? reminder.dueDate : reminder.completionDate; 
    event.startDate = startDate; 
    event.endDate = endDate; 
    let period = Math.abs((startDate - endDate) / 1000); 
    const titleTail = setPeriodDescription(period, reminder.dueDate < reminder.completionDate ? "延迟完成" : "提前"); 
    event.title = `✅${reminder.title} (${titleTail})`; 
  } else { 
    const now = new Date();
    let period = (reminder.dueDate - now) / 1000;
    if (period < 0) {
      period = -period;
      const titleTail = setPeriodDescription(period, "已延期");
      event.title = `❌${reminder.title} (${titleTail})`;
      event.startDate = now;
      event.endDate = now;
      event.isAllDay = true; 
    } else { 
      const titleTail = setPeriodDescription(period, "还剩");
      event.title = `⭕️${reminder.title} (${titleTail})`;
      event.startDate = reminder.dueDate;
      event.endDate = reminder.dueDateIncludesTime ? reminder.dueDate : new Date(reminder.dueDate.getTime() + 86400000);
      event.isAllDay = !reminder.dueDateIncludesTime; } 
  } event.save(); 
}; 

// 更新提醒事项 
// Update reminders
for (const reminder of reminders) { 
  reminder.notes = reminder.notes || "无";
  const targetNote = `[Reminder ID] ${reminder.identifier}`;
  const targetEvent = events.find(event => event.notes && event.notes.includes(targetNote));
  if (!calendarMap.has(reminder.calendar.title)) {
    console.warn(`找不到日历 ${reminder.calendar.title}`);
    continue; 
  } if (targetEvent) {
    updateEvent(targetEvent, reminder); 
  } else { 
    console.warn(`创建事项 ${reminder.title} 到 ${reminder.calendar.title}`);
    const newEvent = new CalendarEvent(); 
    newEvent.notes = `${reminder.notes}\n\n${targetNote}`; 
    updateEvent(newEvent, reminder); 
  } 
} 
Script.complete();
