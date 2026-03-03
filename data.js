// Configuration
const STARTING_BALANCE = 100000;
const RISK_PERCENT = 0.0025; // 0.25% risk per trade
const RISK_PER_TRADE = STARTING_BALANCE * RISK_PERCENT;
const IMAGE_BASE = './images/';

// S&P 500 monthly returns (year-month format: "YYYY-MM")
const sp500MonthlyReturns = {
    '2021-03': 4.2,
    '2021-04': 5.29,
    '2021-05': 0.66,
    '2021-06': 1.91,
    '2021-07': 2.44,
    '2021-08': 2.98,
    '2021-09': -4.97,
    '2021-10': 7.02,
    '2021-11': -0.8,
    '2021-12': 4.26,
    '2022-01': -5.27,
    '2022-02': -2.95,
    '2022-03': 3.44,
    '2022-04': -8.78,
    '2022-05': 0.23,
    '2022-06': -8.64,
    '2022-07': 9.21,
    '2022-08': -4.08,
    '2022-09': -9.62,
    '2022-10': 8.13,
    '2022-11': 5.56,
    '2022-12': -6.19,
    '2023-01': 6.29,
    '2023-02': -2.51,
    '2023-03': 3.31,
    '2023-04': 1.6,
    '2023-05': 0.46,
    '2023-06': 6.09,
    '2023-07': 3.27,
    '2023-08': -1.63,
    '2023-09': -5.08,
    '2023-10': -2.17,
    '2023-11': 9.13,
    '2023-12': 4.14,
    '2024-01': 1.59,
    '2024-02': 5.22,
    '2024-03': 2.95,
    '2024-04': -4.03,
    '2024-05': 5.06,
    '2024-06': 3.2,
    '2024-07': 1.21,
    '2024-08': 2.34,
    '2024-09': 1.79,
    '2024-10': -0.89,
    '2024-11': 5.96,
    '2024-12': -2.73,
    '2025-01': 2.69,
    '2025-02': -1.27,
    '2025-03': -5.86,
    '2025-04': -0.87,
    '2025-05': 6.28,
    '2025-06': 4.83,
    '2025-07': 2.3,
    '2025-08': 2.05,
    '2025-09': 3.28,
    '2025-10': 2.38,
    '2025-11': 0.2,
    '2025-12': -0.05,
    '2026-01': 1.37,
    '2026-02': -0.87,
};

// Funny messages for when Alex beats S&P 500
const AlexWinningMessages = [
    "Not even close.",
    "Is it even a competition?",
    "Alex doesn't play games.",
    "S&P 500 who?",
    "aura?",
    ":)",
    "Alex's just built different.",
    "The market tried. Alex succeeded.",
    "Alex's in a league of his own.",
    "S&P 500 catching strays.",
    "Alex's making it look easy.",
    "The market is shook.",
    "Alex's running circles around them.",
    "S&P 500 needs to step up.",
    "Alex's on another level.",
    "The market can't keep up.",
    "Alex's playing 4D chess.",
    "S&P 500 left in the dust.",
    "Alex's showing them how it's done.",
    "The market is taking notes.",
    "Alex's unstoppable.",
    "S&P 500? More like S&P 500 steps behind.",
    "skill issue"
];

// Funny messages for when Alex loses to S&P 500
const AlexLosingMessages = [
    "The market got lucky this time.",
    "Alex's just warming up.",
    "S&P 500 caught a break.",
    "Alex's playing the long game.",
    "The market got lucky, that's all.",
    "Alex's just letting them think they're winning.",
    "S&P 500 got one, but Alex's got the rest.",
    "The market's celebrating too early.",
    "Alex's just testing their limits.",
    "S&P 500 won the battle, not the war.",
    "Alex's taking notes for next time.",
    "The market got a participation trophy.",
    "Alex's just being nice.",
    ":(",
    "S&P 500 got lucky, we'll see next month.",
    "Alex's letting them have this one.",
    "The market's celebrating prematurely.",
    "Alex's just building suspense.",
    "S&P 500 got a fluke win.",
    "Alex's playing possum.",
    "The market won, but at what cost?"
];

// Weekend jokes for Alex
const weekendJokes = [
    "Alex doesn't work weekends. He's busy painting masterpieces. 🎨",
    "Even algorithms need a break. Alex is recharging his batteries. 🔋",
    "Weekend vibes only. Alex is sipping virtual margaritas on a beach. 🏖️",
    "Markets are closed, but Alex's confidence is always open. 😎",
    "Alex took the weekend off to practice his victory dance. 💃",
    "No trades on weekends. Alex is busy counting his fictional millions. 💰",
    "Alex believes in work-life balance. Mostly life on weekends. 🧘",
    "Markets closed = Alex's spa day. Don't disturb the genius. 🧖",
    "Alex is meditating on his secret sauce. Very zen. 🕯️",
    "Weekend mode: Alex is rewatching his greatest hits. All green candles. 📺",
    "Sir, this is a Wendy's. Markets are closed. 🍔",
    "Alex said no. Touch grass instead. 🌿",
    "Bro really tried to trade on a weekend. 💀"
];

const tradingData = {
    '2026-02-23': {
        image: '02232026-11-0-6-5.png',
        trades: [
            ...Array(6).fill({ result: 'loss', type: 'long', time: '10:00' }),
            ...Array(5).fill({ result: 'breakeven', rr: 1, type: 'long', time: '10:00' })
        ]
    },
    '2026-02-24': {
        image: '02242026-8-0-5-4.png',
        trades: [
            ...Array(5).fill({ result: 'loss', type: 'long', time: '10:00' }),
            ...Array(4).fill({ result: 'breakeven', rr: 1, type: 'long', time: '10:00' })
        ]
    },
    '2026-02-25': {
        image: '02252026-10-0-7-3.png',
        trades: [
            ...Array(7).fill({ result: 'loss', type: 'long', time: '10:00' }),
            ...Array(3).fill({ result: 'breakeven', rr: 1, type: 'long', time: '10:00' })
        ]
    },
    '2026-02-26': {
        image: '02262026-9-1-3-5.png',
        trades: [
            { result: 'win', rr: 10, type: 'long', time: '10:00' },
            ...Array(3).fill({ result: 'loss', type: 'long', time: '10:00' }),
            ...Array(5).fill({ result: 'breakeven', rr: 1, type: 'long', time: '10:00' })
        ]
    },
    '2026-03-02': {
        image: '03022026-10-3-6-1.png',
        trades: [
            ...Array(3).fill({ result: 'win', rr: 10, type: 'long', time: '10:00' }),
            ...Array(6).fill({ result: 'loss', type: 'long', time: '10:00' }),
            { result: 'breakeven', rr: 1, type: 'long', time: '10:00' }
        ]
    }
};
