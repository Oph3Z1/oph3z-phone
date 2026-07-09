const EN = {
    months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

let current = EN;

function pick(arr, fallback) {
    return Array.isArray(arr) && arr.length === fallback.length ? arr : fallback;
}

export function setDateNames(names) {
    current = {
        months: pick(names && names.months, EN.months),
        monthsShort: pick(names && names.monthsShort, EN.monthsShort),
        weekdays: pick(names && names.weekdays, EN.weekdays),
        weekdaysShort: pick(names && names.weekdaysShort, EN.weekdaysShort),
    };
}

export function monthName(index, short = false) {
    const arr = short ? current.monthsShort : current.months;
    return arr[(((index % 12) + 12) % 12)];
}

export function weekdayName(index, short = false) {
    const arr = short ? current.weekdaysShort : current.weekdays;
    return arr[(((index % 7) + 7) % 7)];
}