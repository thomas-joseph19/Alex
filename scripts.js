let currentModalDateStr = null;
let isModalAnimating = false;
let equityChartInstance = null;

function calculateDailyBalances() {
    const sortedDates = Object.keys(tradingData).sort();
    const balances = {};
    let runningBalance = STARTING_BALANCE;

    sortedDates.forEach(dateStr => {
        const startBalance = runningBalance;
        const tradeDetails = [];
        const dayData = tradingData[dateStr];
        if (dayData && dayData.trades) {
            dayData.trades.forEach(trade => {
                const tradeRisk = runningBalance * RISK_PERCENT;
                let tradePnL = 0;

                if (trade.result === 'loss') {
                    tradePnL = -tradeRisk;
                    runningBalance -= tradeRisk;
                } else if (trade.result === 'win' && trade.rr) {
                    tradePnL = tradeRisk * trade.rr;
                    runningBalance += tradePnL;
                }
                // Breakevens don't change balance

                tradeDetails.push({ risk: tradeRisk, pnl: tradePnL });
            });
        }

        balances[dateStr] = {
            startBalance: startBalance,
            endBalance: runningBalance,
            trades: tradeDetails
        };
    });

    return balances;
}

const dailyBalances = calculateDailyBalances();

// Calculate stats for a day (with INTRADAY compounding)
function calculateDayStats(dayData, dateStr) {
    if (!dayData || !dayData.trades || dayData.trades.length === 0) return null;

    const dayBalance = dailyBalances[dateStr] || { startBalance: STARTING_BALANCE, trades: [] };
    const tradeDetails = dayBalance.trades || [];

    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let totalPnL = 0;
    let lossTotal = 0;
    let winTotal = 0;

    dayData.trades.forEach((trade, i) => {
        const detail = tradeDetails[i] || { risk: STARTING_BALANCE * RISK_PERCENT, pnl: 0 };

        if (trade.result === 'win') {
            wins++;
            winTotal += detail.pnl;
            totalPnL += detail.pnl;
        } else if (trade.result === 'loss') {
            losses++;
            lossTotal += detail.pnl;
            totalPnL += detail.pnl;
        } else {
            breakevens++;
        }
    });

    const tradesForWinRate = wins + losses;
    const winRate = tradesForWinRate > 0 ? Math.round((wins / tradesForWinRate) * 100) : 0;
    const totalTrades = dayData.trades.length;
    const displayRisk = tradeDetails.length > 0 ? tradeDetails[0].risk : STARTING_BALANCE * RISK_PERCENT;

    return { wins, losses, breakevens, totalPnL, totalTrades, winRate, dayRisk: displayRisk, lossTotal, winTotal, tradeDetails };
}

// Calculate overall stats from all trading data (with compounding)
function calculateOverallStats() {
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let totalPnL = 0;

    const sortedDates = Object.keys(tradingData).sort();
    const lastDate = sortedDates[sortedDates.length - 1];
    const currentBalance = lastDate && dailyBalances[lastDate]
        ? dailyBalances[lastDate].endBalance
        : STARTING_BALANCE;

    totalPnL = currentBalance - STARTING_BALANCE;

    Object.values(tradingData).forEach(day => {
        if (day.trades) {
            day.trades.forEach(trade => {
                totalTrades++;
                // Only count wins and losses for win rate (breakevens excluded)
                if (trade.result === 'win') wins++;
                else if (trade.result === 'loss') losses++;
            });
        }
    });

    const tradesForWinRate = wins + losses;
    const winRate = tradesForWinRate > 0 ? Math.round((wins / tradesForWinRate) * 100) : 0;
    const currentRisk = currentBalance * RISK_PERCENT;

    return { winRate, totalTrades, totalPnL, currentBalance, currentRisk };
}

function calculateMonthlyStats(year, month) {
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let totalPnL = 0;
    let tradingDays = 0;
    let greenDays = 0;
    let redDays = 0;
    let totalRR = 0;
    let winCount = 0;

    Object.entries(tradingData).forEach(([dateStr, dayData]) => {
        const date = new Date(dateStr + 'T12:00:00');
        if (date.getFullYear() === year && date.getMonth() === month && dayData.trades) {
            const dayStats = calculateDayStats(dayData, dateStr);
            if (dayStats) {
                tradingDays++;
                totalTrades += dayStats.totalTrades;
                wins += dayStats.wins;
                losses += dayStats.losses;
                breakevens += dayStats.breakevens;
                totalPnL += dayStats.totalPnL;
                if (dayStats.totalPnL > 0) greenDays++;
                else if (dayStats.totalPnL < 0) redDays++;

                dayData.trades.forEach(t => {
                    if (t.result === 'win' && t.rr) {
                        totalRR += t.rr;
                        winCount++;
                    }
                });
            }
        }
    });

    const tradesForWinRate = wins + losses;
    const winRate = tradesForWinRate > 0 ? Math.round((wins / tradesForWinRate) * 100) : 0;
    const avgPerTrade = totalTrades > 0 ? Math.round(totalPnL / totalTrades) : 0;
    const avgRR = winCount > 0 ? (totalRR / winCount).toFixed(2) : 0;

    return { totalTrades, wins, losses, breakevens, totalPnL, winRate, tradingDays, greenDays, redDays, avgPerTrade, avgRR };
}

// Animate counting up
function animateValue(id, start, end, suffix, className, isCurrency = false) {
    const el = document.getElementById(id);
    if (!el) return;

    const duration = 1500;
    const startTime = performance.now();

    el.className = 'stat-value ' + className;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeProgress;

        if (isCurrency) {
            el.textContent = (current >= 0 ? '+$' : '-$') + Math.abs(current).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        } else {
            el.textContent = Math.round(current) + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            if (isCurrency) {
                el.textContent = (end >= 0 ? '+$' : '-$') + Math.abs(end).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            } else {
                el.textContent = end + suffix;
            }
        }
    }

    requestAnimationFrame(update);
}

function updateOverallStats() {
    const stats = calculateOverallStats();

    animateValue('winRate', 0, stats.winRate, '%', stats.winRate >= 50 ? 'positive' : 'negative');
    animateValue('totalTrades', 0, stats.totalTrades, '', 'neutral');
    animateValue('totalPnL', 0, stats.totalPnL, '', stats.totalPnL >= 0 ? 'positive' : 'negative', true);

    const balanceEl = document.getElementById('currentBalance');
    if (balanceEl) {
        const duration = 1500;
        const startTime = performance.now();
        const startVal = STARTING_BALANCE;
        const endVal = stats.currentBalance;

        balanceEl.className = 'stat-value ' + (endVal >= STARTING_BALANCE ? 'positive' : 'negative');

        const totalPercentEl = document.getElementById('totalPercentReturn');

        function updateBalance(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = startVal + (endVal - startVal) * easeProgress;
            balanceEl.textContent = '$' + current.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            if (totalPercentEl) {
                const totalPercent = ((current - STARTING_BALANCE) / STARTING_BALANCE) * 100;
                totalPercentEl.className = 'stat-value ' + (totalPercent >= 0 ? 'positive' : 'negative');
                totalPercentEl.textContent = `${totalPercent >= 0 ? '+' : ''}${totalPercent.toFixed(2)}%`;
            }

            if (progress < 1) {
                requestAnimationFrame(updateBalance);
            } else {
                balanceEl.textContent = '$' + endVal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                // Final percent returns
                if (totalPercentEl) {
                    const finalTotalPercent = ((endVal - STARTING_BALANCE) / STARTING_BALANCE) * 100;
                    totalPercentEl.className = 'stat-value ' + (finalTotalPercent >= 0 ? 'positive' : 'negative');
                    totalPercentEl.textContent = `${finalTotalPercent >= 0 ? '+' : ''}${finalTotalPercent.toFixed(2)}%`;
                }

                const sortedDates = Object.keys(tradingData).sort();
                if (sortedDates.length > 0) {
                    const lastDate = sortedDates[sortedDates.length - 1];
                    const lastDateObj = new Date(lastDate + 'T12:00:00');
                    updateMonthlyRecap(lastDateObj.getFullYear(), lastDateObj.getMonth());
                }
            }
        }
        requestAnimationFrame(updateBalance);
    }


    // Calculate Max Drawdown
    let maxDrawdown = 0;
    let peak = STARTING_BALANCE;
    const sortedDates = Object.keys(dailyBalances).sort();

    // Iterate through daily balances to find max drawdown
    for (const date of sortedDates) {
        const balance = dailyBalances[date].endBalance;
        if (balance > peak) {
            peak = balance;
        }
        const drawdown = (peak - balance) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    const maxDrawdownPercent = (maxDrawdown * 100).toFixed(2);
    const mddEl = document.getElementById('maxDrawdown');
    if (mddEl) {
        mddEl.textContent = maxDrawdownPercent + '%';
        // Add a simple fade-in or let it inherit static style (since it's a negative metric, usually stays static or we can animate)
        // Animating it nicely:
        animateValue('maxDrawdown', 0, parseFloat(maxDrawdownPercent), '%', 'negative');
    }

    initEquityChart();
}




function initEquityChart() {
    const ctx = document.getElementById('equityChart');
    if (!ctx) return;

    const sortedDates = Object.keys(dailyBalances).sort();
    const labels = sortedDates;
    const dataPoints = sortedDates.map(date => dailyBalances[date].endBalance);

    // If chart already exists, destroy it to re-render (e.g. on updates)
    if (equityChartInstance) {
        equityChartInstance.destroy();
    }

    // Gradient fill
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)'); // Accent color
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    // Initial state for fade-in
    ctx.style.opacity = '0';
    ctx.style.transition = 'opacity 1s ease-out';

    equityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Account Balance',
                data: dataPoints,
                borderColor: '#8b5cf6',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            animation: {
                y: {
                    duration: 1500,
                    easing: 'easeOutQuart',
                    from: (ctx) => {
                        if (ctx.type === 'data') {
                            // Start 30 pixels lower for a subtle drift up
                            return ctx.element.y + 30;
                        }
                    }
                },
                x: { duration: 0 } // No horizontal animation
            },
            responsive: true,
            maintainAspectRatio: false,
            // Trigger opacity fade after chart init
            onResize: () => {
                // Ensure opacity stays 1 on resize
                ctx.style.opacity = '1';
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.9)', // Zinc-900 with opacity
                    titleColor: '#f4f4f5', // Zinc-100
                    bodyColor: '#e4e4e7', // Zinc-200
                    titleFont: {
                        family: "'Inter', sans-serif",
                        size: 13,
                        weight: '600'
                    },
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 13,
                        weight: '500'
                    },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false, // Cleaner look without color box
                    callbacks: {
                        label: function (context) {
                            if (context.parsed.y !== null) {
                                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                            }
                            return '';
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: {
                    display: false,
                    grid: {
                        display: false
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)', // Very subtle grid
                        borderDash: [5, 5],
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        color: '#71717a', // Zinc-500
                        padding: 10,
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // Trigger the fade-in
    requestAnimationFrame(() => {
        setTimeout(() => {
            ctx.style.opacity = '1';
        }, 50);
    });
}

function updateMonthlyRecap(year, month) {
    try {
        const stats = calculateMonthlyStats(year, month);
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const recapMonthEl = document.getElementById('recapMonth');
        if (recapMonthEl) {
            const expectedText = `${months[month]} ${year}`;
            if (recapMonthEl.textContent !== expectedText &&
                !recapMonthEl.classList.contains('slide-out-left') &&
                !recapMonthEl.classList.contains('slide-out-right') &&
                !recapMonthEl.classList.contains('slide-in-left') &&
                !recapMonthEl.classList.contains('slide-in-right')) {
                recapMonthEl.textContent = expectedText;
            }
        }

        const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
        const sortedDates = Object.keys(tradingData).sort();
        let monthlyReturn = null;
        let monthlyStartBalance = STARTING_BALANCE;

        // Find first day of this month
        const firstDayOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        if (dailyBalances[firstDayOfMonth]) {
            monthlyStartBalance = dailyBalances[firstDayOfMonth].startBalance;
        } else {
            // Find last day before this month
            for (let i = sortedDates.length - 1; i >= 0; i--) {
                const dateStr = sortedDates[i];
                const dateObj = new Date(dateStr + 'T12:00:00');
                const dateYear = dateObj.getFullYear();
                const dateMonth = dateObj.getMonth();

                if (dateYear < year || (dateYear === year && dateMonth < month)) {
                    if (dailyBalances[dateStr]) {
                        monthlyStartBalance = dailyBalances[dateStr].endBalance;
                    }
                    break;
                }
            }
        }

        // Find last day of this month
        let monthlyEndBalance = monthlyStartBalance;
        for (let i = sortedDates.length - 1; i >= 0; i--) {
            const dateStr = sortedDates[i];
            const dateObj = new Date(dateStr + 'T12:00:00');
            const dateYear = dateObj.getFullYear();
            const dateMonth = dateObj.getMonth();

            if (dateYear === year && dateMonth === month) {
                if (dailyBalances[dateStr]) {
                    monthlyEndBalance = dailyBalances[dateStr].endBalance;
                }
                break;
            }
        }

        if (monthlyEndBalance !== monthlyStartBalance) {
            monthlyReturn = ((monthlyEndBalance - monthlyStartBalance) / monthlyStartBalance) * 100;
        }

        const recapStats = document.getElementById('recapStats');
        if (!recapStats) {
            console.error('recapStats element not found');
            return;
        }

        const displayReturn = monthlyReturn || 0;

        recapStats.innerHTML = `
            <div class="recap-stat" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div class="recap-stat-value" style="color: ${stats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)'}">
                    ${stats.totalPnL >= 0 ? '+' : '-'}$${Math.abs(stats.totalPnL).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </div>
                <div class="recap-stat-label">Month P&L</div>
            </div>

            <div class="recap-stat">
                <div class="recap-stat-value" style="color: ${displayReturn >= 0 ? 'var(--green)' : 'var(--red)'}">
                    ${displayReturn >= 0 ? '+' : ''}${displayReturn.toFixed(2)}%
                </div>
                <div class="recap-stat-label">Return</div>
            </div>
            <div class="recap-stat">
                <div class="recap-stat-value" style="color: ${stats.winRate >= 50 ? 'var(--green)' : 'var(--red)'}">
                    ${stats.winRate}%
                </div>
                <div class="recap-stat-label">Win Rate</div>
            </div>

            <div class="recap-stat">
                <div class="recap-stat-value" style="color: var(--green)">${stats.avgRR}</div>
                <div class="recap-stat-label">Avg RR</div>
            </div>

            <div class="recap-stat">
                <div class="recap-stat-value" style="color: var(--accent)">${stats.totalTrades}</div>
                <div class="recap-stat-label">Trades</div>
            </div>

            <div class="recap-stat">
                <div class="recap-stat-value" style="color: var(--green)">${stats.wins}</div>
                <div class="recap-stat-label">Wins</div>
            </div>

            <div class="recap-stat">
                <div class="recap-stat-value" style="color: var(--red)">${stats.losses}</div>
                <div class="recap-stat-label">Losses</div>
            </div>
        `;

        if (stats.tradingDays > 0) {
            const greenPercent = (stats.greenDays / stats.tradingDays) * 100;
            const redPercent = (stats.redDays / stats.tradingDays) * 100;
            const dayLabel = stats.tradingDays === 1 ? 'Day' : 'Days';

            recapStats.innerHTML += `
                <div class="recap-stat days-bar-container" style="grid-column: 1 / -1;">
                    <div class="days-bar-header">
                        <span style="color: var(--green)">${stats.greenDays} Green</span>
                        <span style="color: var(--text-dim);">${stats.tradingDays} ${dayLabel}</span>
                        <span style="color: var(--red)">${stats.redDays} Red</span>
                    </div>
                    <div class="days-bar" style="gap: 4px; background: transparent; box-shadow: none;">
                        <div class="days-bar-green" style="width: ${greenPercent}%; border-radius: 4px;"></div>
                        <div class="days-bar-red" style="width: ${redPercent}%; border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        }

        if (monthlyReturn !== null && sp500MonthlyReturns[yearMonth] !== undefined) {
            const sp500Return = sp500MonthlyReturns[yearMonth];
            const vsSp500 = monthlyReturn - sp500Return;
            const absDifference = Math.abs(vsSp500);
            const now = new Date();
            const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

            let winLossMessage = "";
            if (vsSp500 > 0) {
                winLossMessage = isPast ? `Pablo won by ${absDifference.toFixed(2)}%` : `Pablo's winning by ${absDifference.toFixed(2)}%`;
            } else if (vsSp500 < 0) {
                winLossMessage = isPast ? `Pablo lost by ${absDifference.toFixed(2)}%` : `Pablo's losing by ${absDifference.toFixed(2)}%`;
            } else {
                winLossMessage = isPast ? "Pablo tied with the S&P 500" : "Pablo's tied with the S&P 500";
            }

            const funnyMessage = vsSp500 > 0 ? pabloWinningMessages[Math.floor(Math.random() * pabloWinningMessages.length)]
                : vsSp500 < 0 ? pabloLosingMessages[Math.floor(Math.random() * pabloLosingMessages.length)] : '';

            const blueHex = '#3b82f6';
            const pabloIsPositive = monthlyReturn >= 0;
            const pabloColor = pabloIsPositive ? 'var(--green)' : 'var(--red)';
            const pabloBg = pabloIsPositive ? 'linear-gradient(90deg, var(--green) 0%, #22c55e 100%)' : 'linear-gradient(90deg, var(--red) 0%, #ef4444 100%)';
            const pabloShadow = pabloIsPositive ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(239, 68, 68, 0.4)';

            const spIsPositive = sp500Return >= 0;
            const sp500Color = spIsPositive ? blueHex : 'var(--red)';
            const sp500Icon = spIsPositive ? '📈' : '📉';
            const sp500Bg = spIsPositive ? `linear-gradient(90deg, ${blueHex} 0%, #60a5fa 100%)` : 'linear-gradient(90deg, var(--red) 0%, #ef4444 100%)';
            const sp500Shadow = spIsPositive ? `0 0 8px rgba(59, 130, 246, 0.4)` : '0 0 8px rgba(239, 68, 68, 0.4)';

            const absPablo = Math.abs(monthlyReturn);
            const absSp500 = Math.abs(sp500Return);
            let pabloWidth = 50;
            let sp500Width = 50;
            const totalAbs = absPablo + absSp500;

            if (totalAbs > 0.001) {
                const rawPabloPct = (absPablo / totalAbs) * 100;
                const rawSp500Pct = (absSp500 / totalAbs) * 100;
                if (rawPabloPct < 15) {
                    pabloWidth = 15; sp500Width = 85;
                } else if (rawSp500Pct < 15) {
                    sp500Width = 15; pabloWidth = 85;
                } else {
                    pabloWidth = rawPabloPct; sp500Width = rawSp500Pct;
                }
            }

            const winLossColor = vsSp500 >= 0 ? 'var(--green)' : 'var(--red)';

            recapStats.innerHTML += `
                <div class="recap-stat days-bar-container" style="grid-column: 1 / -1;">
                    <div class="days-bar-header">
                        <span style="color: ${pabloColor}; font-weight: 600;">🎨 Pablo ${monthlyReturn >= 0 ? '+' : ''}${monthlyReturn.toFixed(2)}%</span>
                        <span style="color: var(--text-dim);">vs</span>
                        <span style="color: ${sp500Color}; font-weight: 600;">${sp500Icon} S&P 500 ${sp500Return >= 0 ? '+' : ''}${sp500Return.toFixed(2)}%</span>
                    </div>
                    <div class="sp500-comparison-bar" style="gap: 4px; background: transparent; box-shadow: none;">
                        <div style="width: ${pabloWidth}%; height: 100%; border-radius: 4px; background: ${pabloBg}; box-shadow: ${pabloShadow}; transition: all 0.5s ease;"></div>
                        <div style="width: ${sp500Width}%; height: 100%; border-radius: 4px; background: ${sp500Bg}; box-shadow: ${sp500Shadow}; transition: all 0.5s ease;"></div>
                    </div>
                    <div style="margin-top: 0.75rem; font-size: 0.875rem; font-weight: 500; color: ${winLossColor}; text-align: center;">${winLossMessage}</div>
                    ${funnyMessage ? `<div style="margin-top: 0.5rem; font-size: 0.75rem; font-style: italic; opacity: 0.8; color: var(--text-dim); text-align: center;">${funnyMessage}</div>` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating monthly recap:', error);
    }
}

function formatPnL(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

let currentDate = new Date();
let monthDirection = null;
const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function animateMonthText(element, direction) {
    if (!element || !direction) return;
    element.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left', 'slide-in-right');
    if (direction === 'prev') {
        element.classList.add('slide-out-right');
    } else {
        element.classList.add('slide-out-left');
    }
    setTimeout(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        element.textContent = `${months[month]} ${year}`;
        element.classList.remove('slide-out-left', 'slide-out-right');
        if (direction === 'prev') {
            element.classList.add('slide-in-left');
        } else {
            element.classList.add('slide-in-right');
        }
        setTimeout(() => {
            element.classList.remove('slide-in-left', 'slide-in-right');
            monthDirection = null;
        }, 300);
    }, 150);
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('currentMonth');
    const recapStats = document.getElementById('recapStats');

    if (!grid || !monthLabel) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (monthDirection) {
        const direction = monthDirection;
        animateMonthText(monthLabel, direction);
        const recapMonthLabel = document.getElementById('recapMonth');
        if (recapMonthLabel) animateMonthText(recapMonthLabel, direction);

        if (recapStats) {
            recapStats.style.transition = 'all 0.15s ease-in';
            recapStats.style.opacity = '0';
            recapStats.style.transform = direction === 'next' ? 'translateX(-10px)' : 'translateX(10px)';

            setTimeout(() => {
                updateMonthlyRecap(year, month);
                recapStats.style.transition = 'none';
                recapStats.style.transform = direction === 'next' ? 'translateX(10px)' : 'translateX(-10px)';
                void recapStats.offsetWidth;
                recapStats.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                recapStats.style.opacity = '1';
                recapStats.style.transform = 'translateX(0)';
            }, 150);
        }
        monthDirection = null;
    } else {
        monthLabel.textContent = `${months[month]} ${year}`;
        const recapMonthLabel = document.getElementById('recapMonth');
        if (recapMonthLabel) recapMonthLabel.textContent = `${months[month]} ${year}`;
        updateMonthlyRecap(year, month);
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    grid.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDate = new Date(year, month, day);
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

        if (isWeekend) dayEl.classList.add('weekend');
        if (dayDate.toDateString() === today.toDateString()) dayEl.classList.add('today');

        if (dayDate > today) {
            dayEl.classList.add('future');
        } else {
            if (tradingData[dateStr]) {
                const dayStats = calculateDayStats(tradingData[dateStr], dateStr);
                if (dayStats) {
                    dayEl.classList.add('has-data');
                    dayEl.classList.add(dayStats.totalPnL > 0 ? 'positive' : dayStats.totalPnL < 0 ? 'negative' : 'neutral');
                }
            }
            dayEl.addEventListener('click', () => openModal(dateStr, isWeekend));
        }
        dayEl.style.animation = `fadeInScale 0.4s ease-out ${(firstDay + day) * 0.02}s both`;
        grid.appendChild(dayEl);
    }
}

function changeModalDay(offset) {
    if (!currentModalDateStr || isModalAnimating) return;
    isModalAnimating = true;

    const content = document.getElementById('modalContent');
    const dateLabel = document.getElementById('modalDate');
    const exitClass = offset === 1 ? 'slide-out-left' : 'slide-out-right';
    const enterClass = offset === 1 ? 'slide-in-right' : 'slide-in-left';

    if (content) content.classList.add(exitClass);
    if (dateLabel) dateLabel.classList.add(exitClass);

    setTimeout(() => {
        const date = new Date(currentModalDateStr + 'T12:00:00');
        date.setDate(date.getDate() + offset);
        const newDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        openModal(newDateStr, isWeekend);

        const newContent = document.getElementById('modalContent');
        const newDateLabel = document.getElementById('modalDate');
        if (newContent) {
            newContent.classList.remove('slide-out-left', 'slide-out-right');
            newContent.classList.add(enterClass);
        }
        if (newDateLabel) {
            newDateLabel.classList.remove('slide-out-left', 'slide-out-right');
            newDateLabel.classList.add(enterClass);
        }

        setTimeout(() => {
            if (newContent) newContent.classList.remove('slide-in-left', 'slide-in-right');
            if (newDateLabel) newDateLabel.classList.remove('slide-in-left', 'slide-in-right');
            isModalAnimating = false;
        }, 150);
    }, 150);
}

function openModal(dateStr, isWeekend = false) {
    currentModalDateStr = dateStr;
    const overlay = document.getElementById('modalOverlay');
    const dateEl = document.getElementById('modalDate');
    const content = document.getElementById('modalContent');
    const date = new Date(dateStr + 'T12:00:00');

    dateEl.textContent = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (isWeekend) {
        const joke = weekendJokes[Math.floor(Math.random() * weekendJokes.length)];
        content.innerHTML = `
            <div class="no-data">
                <span class="no-data-emoji">🏖️</span>
                <p class="weekend-message">${joke}</p>
                <p style="margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-dim);">
                    Markets are closed on weekends.<br><span class="highlight">Come back Monday!</span>
                </p>
            </div>
        `;
    } else {
        const data = tradingData[dateStr];
        if (data && data.trades && data.trades.length > 0) {
            const dayStats = calculateDayStats(data, dateStr);
            const dayRisk = dayStats.dayRisk;
            const bestRR = Math.max(...data.trades.filter(t => t.rr).map(t => t.rr), 0);
            const tradeDetails = dayStats.tradeDetails || [];

            const tradesHtml = data.trades.map((t, i) => {
                const detail = tradeDetails[i] || { pnl: 0, risk: dayRisk };
                return `
                    <div class="trade-item">
                        <span class="trade-time">${t.time}</span>
                        <span class="trade-type ${t.type}">${t.type.toUpperCase()}</span>
                        <span class="trade-risk">$${Math.round(detail.risk)}</span>
                        <span class="trade-result ${t.result}">${formatPnL(detail.pnl)}</span>
                    </div>
                `;
            }).join('');

            const imageHtml = data.image ? `<img class="modal-image" src="${IMAGE_BASE}${data.image}" alt="Trade Recap">` : '';
            const notesHtml = data.notes ? `<div class="modal-notes">📝 ${data.notes}</div>` : '';

            content.innerHTML = `
                ${imageHtml}
                <div class="modal-stats">
                    <div class="modal-stat"><div class="modal-stat-value" style="color: ${dayStats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)'}">${formatPnL(dayStats.totalPnL)}</div><div class="modal-stat-label">Day P&L</div></div>
                    <div class="modal-stat"><div class="modal-stat-value" style="color: ${dayStats.winRate >= 50 ? 'var(--green)' : 'var(--red)'}">${dayStats.winRate}%</div><div class="modal-stat-label">Win Rate</div></div>
                </div>
                <div class="modal-breakdown">
                    <div class="modal-breakdown-item"><div class="modal-breakdown-label">Start Risk</div><div class="modal-breakdown-value">$${dayRisk.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div></div>
                    <div class="modal-breakdown-item"><div class="modal-breakdown-label">Trades</div><div class="modal-breakdown-value">${dayStats.totalTrades}</div></div>
                    <div class="modal-breakdown-item"><div class="modal-breakdown-label">Wins</div><div class="modal-breakdown-value" style="color: var(--green)">${dayStats.wins}</div></div>
                    <div class="modal-breakdown-item"><div class="modal-breakdown-label">Losses</div><div class="modal-breakdown-value" style="color: var(--red)">${dayStats.losses}</div></div>
                    <div class="modal-breakdown-item"><div class="modal-breakdown-label">BE</div><div class="modal-breakdown-value">${dayStats.breakevens}</div></div>
                    ${bestRR > 0 ? `<div class="modal-breakdown-item"><div class="modal-breakdown-label">Best RR</div><div class="modal-breakdown-value" style="color: var(--green)">+${bestRR.toFixed(2)}</div></div>` : ''}
                </div>
                <div class="modal-pnl-row">
                    <div class="modal-pnl-item loss"><span class="modal-pnl-label">Losses</span><span class="modal-pnl-value">${formatPnL(dayStats.lossTotal)}</span></div>
                    <div class="modal-pnl-item win"><span class="modal-pnl-label">Wins</span><span class="modal-pnl-value">${formatPnL(dayStats.winTotal)}</span></div>
                </div>
                ${notesHtml}
                <div class="modal-trades"><div class="modal-trades-title">Trade Log</div>${tradesHtml}</div>
            `;
        } else {
            const noTradeMessages = [
                { emoji: '😴', text: 'Maybe Pablo was taking a nap.' },
                { emoji: '🎨', text: 'Pablo was busy painting masterpieces instead of trading.' },
                { emoji: '🧘', text: 'Pablo was meditating on market conditions. No valid setups found.' },
                { emoji: '☕', text: 'Pablo was sipping coffee, waiting for the perfect entry. None came.' },
                { emoji: '🔍', text: 'Pablo searched all day but found no valid setups. Patience is key.' },
                { emoji: '📚', text: 'Pablo was studying the charts. Sometimes the best trade is no trade.' },
                { emoji: '🎯', text: 'Pablo was waiting for the perfect setup. Today wasn\'t the day.' },
                { emoji: '🏖️', text: 'Pablo took a mental health day. Markets can wait.' },
                { emoji: '🍕', text: 'Pablo was ordering pizza. Sometimes you just need a break.' }
            ];
            const randomMessage = noTradeMessages[Math.floor(Math.random() * noTradeMessages.length)];
            content.innerHTML = `<div class="no-data"><span class="no-data-emoji">${randomMessage.emoji}</span><p>No trades recorded for this day.</p><p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-dim);">${randomMessage.text}</p></div>`;
        }
    }
    setTimeout(() => {
        overlay.classList.add('active');
        // Init smooth scroll on the modal container
        const modalContainer = overlay.querySelector('.modal');
        if (modalContainer) initModalSmoothScroll(modalContainer);
    }, 100);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    destroyModalSmoothScroll();
}

function initRecapState() {
    const monthlyRecap = document.getElementById('monthlyRecap');
    if (monthlyRecap) {
        const savedState = localStorage.getItem('monthlyRecapCollapsed');
        if (savedState === 'true') monthlyRecap.classList.add('collapsed');
        else monthlyRecap.classList.remove('collapsed');
    }
}

function initUpdatesState() {
    const updatesList = document.getElementById('updatesList');
    const updatesSection = document.querySelector('.updates-section');
    if (updatesList && updatesSection) {
        const savedState = localStorage.getItem('updatesListCollapsed');
        if (savedState === null || savedState === 'true') {
            updatesList.classList.add('collapsed');
            updatesSection.classList.add('collapsed');
        } else {
            updatesList.classList.remove('collapsed');
            updatesSection.classList.remove('collapsed');
        }
    }
}

function setupEventListeners() {
    const recapHeader = document.getElementById('recapHeader');
    const monthlyRecap = document.getElementById('monthlyRecap');
    if (recapHeader && monthlyRecap) {
        recapHeader.addEventListener('click', () => {
            monthlyRecap.classList.toggle('collapsed');
            localStorage.setItem('monthlyRecapCollapsed', monthlyRecap.classList.contains('collapsed'));
        });
    }

    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    function updateNavButtons() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        if (year < 2025 || (year === 2025 && month <= 11)) {
            prevMonthBtn.style.opacity = '0.3'; prevMonthBtn.style.cursor = 'not-allowed';
        } else {
            prevMonthBtn.style.opacity = '1'; prevMonthBtn.style.cursor = 'pointer';
        }
    }

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            const year = currentDate.getFullYear(); const month = currentDate.getMonth();
            if (year === 2025 && month === 11) return;
            monthDirection = 'prev'; currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(); updateNavButtons();
        });
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            monthDirection = 'next'; currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(); updateNavButtons();
        });
    }
    updateNavButtons();

    const updatesHeader = document.getElementById('updatesHeader');
    const updatesList = document.getElementById('updatesList');
    const updatesSection = document.querySelector('.updates-section');
    if (updatesHeader && updatesList && updatesSection) {
        updatesHeader.addEventListener('click', () => {
            updatesList.classList.toggle('collapsed');
            updatesSection.classList.toggle('collapsed');
            localStorage.setItem('updatesListCollapsed', updatesList.classList.contains('collapsed'));
            void updatesList.offsetWidth;
        });
    }

    const disclaimerBtn = document.getElementById('disclaimerBtn');
    const disclaimerClose = document.getElementById('disclaimerClose');
    const disclaimerModal = document.getElementById('disclaimerModal');
    if (disclaimerBtn && disclaimerModal) {
        disclaimerBtn.addEventListener('click', () => {
            disclaimerModal.classList.add('active');
            const modalContainer = disclaimerModal.querySelector('.modal');
            if (modalContainer) initModalSmoothScroll(modalContainer);
        });
    }
    if (disclaimerClose && disclaimerModal) {
        disclaimerClose.addEventListener('click', () => {
            disclaimerModal.classList.remove('active');
            destroyModalSmoothScroll();
        });
    }
    if (disclaimerModal) {
        disclaimerModal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                disclaimerModal.classList.remove('active');
                destroyModalSmoothScroll();
            }
        });
    }

    const modalClose = document.getElementById('modalClose');
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

    const modalPrev = document.getElementById('modalPrev');
    const modalNext = document.getElementById('modalNext');
    if (modalPrev) modalPrev.addEventListener('click', () => changeModalDay(-1));
    if (modalNext) modalNext.addEventListener('click', () => changeModalDay(1));

    document.addEventListener('keydown', (e) => {
        const overlay = document.getElementById('modalOverlay');
        if (overlay && overlay.classList.contains('active')) {
            if (e.key === 'ArrowLeft') changeModalDay(-1);
            if (e.key === 'ArrowRight') changeModalDay(1);
            if (e.key === 'Escape') {
                closeModal();
                if (disclaimerModal) disclaimerModal.classList.remove('active');
            }
        }
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

initTheme();

// Auto-resize font to fit container width
function autoResizeFont() {
    function resizeElement(el) {
        const container = el.parentElement;
        if (!container) return;

        const containerWidth = container.offsetWidth - 32; // Account for padding
        let fontSize = parseFloat(getComputedStyle(el).fontSize);
        const originalFontSize = fontSize;

        el.style.fontSize = fontSize + 'px';

        // Binary search for optimal font size
        let minSize = 0.5; // Minimum font size
        let maxSize = originalFontSize;

        while (maxSize - minSize > 0.1) {
            fontSize = (minSize + maxSize) / 2;
            el.style.fontSize = fontSize + 'px';

            if (el.scrollWidth <= containerWidth) {
                minSize = fontSize;
            } else {
                maxSize = fontSize;
            }
        }

        el.style.fontSize = minSize + 'px';
    }

    // Resize stat values in account cards
    document.querySelectorAll('.account-card .stat-value').forEach(resizeElement);

    // Resize stat values in stat cards
    document.querySelectorAll('.stat-card .stat-value').forEach(resizeElement);

    // Resize recap stat values
    document.querySelectorAll('.recap-stat-value').forEach(resizeElement);
}

// Run on load and resize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(autoResizeFont, 100);
    });
} else {
    setTimeout(autoResizeFont, 100);
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(autoResizeFont, 150);
});

// Hook into updateOverallStats to resize fonts after stats update
const originalUpdateOverallStats = updateOverallStats;
updateOverallStats = function () {
    originalUpdateOverallStats.apply(this, arguments);
    // Resize fonts after animation completes (1500ms + buffer)
    setTimeout(autoResizeFont, 1700);
};

// Intersection Observer for scroll reveal animations
function initScrollReveal() {
    // Add reveal classes to elements (excluding updates section internals)
    const elementsToReveal = [
        // Hero elements
        { selector: '.hero .logo', class: 'reveal-scale' },
        { selector: '.hero h1', class: 'reveal' },
        { selector: '.hero .tagline', class: 'reveal' },
        { selector: '.hero .trust', class: 'reveal-scale' },
        { selector: '.hero .status', class: 'reveal' },
        { selector: '.hero .description', class: 'reveal' },
        { selector: '.hero .links', class: 'reveal' },

        // Disclaimer button
        { selector: '#disclaimerBtn', class: 'reveal-scale', parent: true },

        // Updates section
        { selector: '.updates-section', class: 'reveal' },

        // Account cards - stagger
        { selector: '.account-section', class: 'reveal-stagger' },

        // Stats - stagger
        { selector: '.stats', class: 'reveal-stagger' },

        // Legend - container only
        { selector: '.legend', class: 'reveal' },

        // Calendar section
        { selector: '.calendar-section .section-header', class: 'reveal' },
        { selector: '.monthly-recap', class: 'reveal-scale' },
        { selector: '.calendar', class: 'reveal' },

        // Footer
        { selector: 'footer', class: 'reveal-fade' }
    ];

    elementsToReveal.forEach(({ selector, class: className, parent }) => {
        const el = document.querySelector(selector);
        if (el) {
            const target = parent ? el.parentElement : el;
            if (target && !target.classList.contains(className)) {
                target.classList.add(className);
            }
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                // Remove visible class when leaving viewport for re-animation
                entry.target.classList.remove('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe all reveal elements
    document.querySelectorAll('.reveal, .reveal-stagger, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade').forEach(el => {
        observer.observe(el);
    });
}

// Background Canvas Animation
// Background Canvas Animation
// Background Canvas Animation
// Background Canvas Animation
// Background Canvas Animation
function initCanvasBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;

    // Theme
    let accentRgb = '139, 92, 246'; // Default purple
    let time = 0;

    // Objects
    let topoLines = [];
    const lineSpacing = 60;
    const waveAmplitude = 35;

    // --- Common Setup ---
    function updateDimensions() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    function updateThemeColors() {
        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim();
        if (accent.startsWith('#')) {
            const r = parseInt(accent.slice(1, 3), 16);
            const g = parseInt(accent.slice(3, 5), 16);
            const b = parseInt(accent.slice(5, 7), 16);
            accentRgb = `${r}, ${g}, ${b}`;
        }
    }

    // --- Topology Logic ---
    class TopoLine {
        constructor(baseY, index) {
            this.baseY = baseY;
            this.index = index;
            this.freq1 = 0.001 + Math.random() * 0.002;
            this.freq2 = 0.003 + Math.random() * 0.005;
            this.freq3 = 0.01 + Math.random() * 0.01;
            this.phase = Math.random() * Math.PI * 2;
        }

        draw(scrollY) {
            ctx.beginPath();
            const parallaxY = this.baseY - (scrollY * 0.2);
            // Optimization: Only draw if on screen
            if (parallaxY < -100 || parallaxY > height + 100) return;

            for (let x = -50; x <= width + 50; x += 20) {
                // Combine sine waves to create "organic" irregularity (Slowed down time factors)
                const yOffset =
                    Math.sin(x * this.freq1 + time * 0.001 + this.phase) * waveAmplitude +
                    Math.sin(x * this.freq2 - time * 0.0005 + this.index) * (waveAmplitude * 0.5) +
                    Math.sin(x * this.freq3 + time * 0.0015) * (waveAmplitude * 0.2);
                const y = parallaxY + yOffset;
                if (x === -50) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(${accentRgb}, 0.25)`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    function initTopology() {
        topoLines = [];
        // Add extra lines for scrolling coverage
        const count = Math.ceil((height + 1000) / lineSpacing);
        for (let i = 0; i < count; i++) {
            topoLines.push(new TopoLine(i * lineSpacing, i));
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        time++;

        const currentScrollY = window.scrollY || 0;
        topoLines.forEach(line => line.draw(currentScrollY));

        requestAnimationFrame(animate);
    }

    // Initialize
    updateDimensions();
    updateThemeColors();
    initTopology();
    animate();

    // Event Listeners
    window.addEventListener('resize', () => {
        updateDimensions();
        initTopology();
    });

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            setTimeout(updateThemeColors, 50);
        });
    }
}

// Smooth Scrolling & Scroll Effects (Lenis)
// Smooth Scrolling & Scroll Effects (Lenis)
let mainLenis;
let modalLenis;

function initSmoothScroll() {
    if (typeof Lenis === 'undefined') return;

    // Tighter, less "floaty" configuration
    mainLenis = new Lenis({
        duration: 0.7,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    const progressBar = document.getElementById('scroll-progress');

    function raf(time) {
        mainLenis.raf(time);
        if (modalLenis) modalLenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Scroll event listener for effects
    mainLenis.on('scroll', ({ scroll, limit }) => {
        // 1. Progress Bar
        if (progressBar) {
            const progress = limit > 0 ? (scroll / limit) * 100 : 0;
            progressBar.style.width = `${progress}%`;
        }
    });
}

function initModalSmoothScroll(modalEl) {
    if (typeof Lenis === 'undefined' || !modalEl) return;

    // Destroy existing if any to be safe
    if (modalLenis) modalLenis.destroy();

    modalLenis = new Lenis({
        wrapper: modalEl, // The scrollable container
        content: modalEl.children[0], // The content inside (usually first child works if wrapped, or we might need to target specific content div)
        // actually Lenis wrapper/content works best if wrapper is the overflow element. 
        // Our .modal has overflow-y: auto. So wrapper = .modal.
        duration: 0.7,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    // Stop main scrolling while modal is open
    if (mainLenis) mainLenis.stop();
}

function destroyModalSmoothScroll() {
    if (modalLenis) {
        modalLenis.destroy();
        modalLenis = null;
    }
    if (mainLenis) mainLenis.start();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initRecapState(); initUpdatesState(); setupEventListeners(); renderCalendar();
        setTimeout(updateOverallStats, 800);
        initScrollReveal();
        initCanvasBackground();
        initSmoothScroll();
    });
} else {
    initRecapState(); initUpdatesState(); setupEventListeners(); renderCalendar();
    setTimeout(updateOverallStats, 800);
    initScrollReveal();
    initCanvasBackground();
    initSmoothScroll();
}
