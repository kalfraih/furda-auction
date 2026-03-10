// Utility for chart domain calculation
export function getIntradayBounds(data: { time: string }[]): [number, number] | null {
    if (!data || data.length === 0) return null;

    // Use the first data point to determine the session day
    const firstTime = new Date(data[0].time);

    // Check if Ramadan (before March 20, 2026)
    const isRamadan = firstTime < new Date(2026, 2, 20);

    // Get YYYY-MM-DD in Kuwait time
    const kwtDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kuwait",
    }).format(firstTime);

    const kwtHour = parseInt(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kuwait",
            hour: "numeric",
            hour12: false
        }).format(firstTime),
        10
    );

    let startMs: number, endMs: number;

    if (isRamadan) {
        // Ramadan trading hours: approx 8 PM to 6 AM (polling window)
        // If hour < 6, it means we are past midnight in the overnight session
        if (kwtHour < 6) {
            const prevDay = new Date(firstTime.getTime() - 86400000);
            const prevDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuwait" }).format(prevDay);
            startMs = new Date(`${prevDateStr}T20:00:00+03:00`).getTime();
            endMs = new Date(`${kwtDateStr}T06:00:00+03:00`).getTime();
        } else {
            const nextDay = new Date(firstTime.getTime() + 86400000);
            const nextDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuwait" }).format(nextDay);
            startMs = new Date(`${kwtDateStr}T20:00:00+03:00`).getTime();
            endMs = new Date(`${nextDateStr}T06:00:00+03:00`).getTime();
        }
    } else {
        // Normal trading hours: approx 9 AM to 5 PM
        startMs = new Date(`${kwtDateStr}T09:00:00+03:00`).getTime();
        endMs = new Date(`${kwtDateStr}T17:00:00+03:00`).getTime();
    }

    return [startMs, endMs];
}
