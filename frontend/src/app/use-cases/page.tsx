'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Copy,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown,
    Target,
    AlertTriangle,
    Zap,
    BarChart2,
    Activity,
    Percent,
    Layers,
    ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';

interface UseCase {
    id: string;
    title: string;
    description: string;
    difficulty: 'Basic' | 'Intermediate' | 'Advanced';
    icon: React.ReactNode;
    features: string[];
    pineScript?: string;
    jsonTemplate: string;
    notes?: string;
}

export default function UseCasesPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [expandedCase, setExpandedCase] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const webhookSecret = user?.webhook_secret || 'YOUR_WEBHOOK_SECRET';

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(id);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const useCases: UseCase[] = [
        // BASIC
        {
            id: 'basic-buy-sell',
            title: '1. Basic Buy/Sell with TP/SL',
            description: 'Simple market order with fixed Take Profit and Stop Loss levels.',
            difficulty: 'Basic',
            icon: <TrendingUp className="h-5 w-5" />,
            features: ['Market order', 'Fixed TP/SL', 'No Pine Script needed'],
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "XAUUSD",
  "action": "buy",
  "quantity": 0.1,
  "stop_loss": 2600,
  "take_profit": 2650,
  "comment": "Manual_Signal"
}`,
            notes: 'Replace symbol with your broker\'s exact symbol (e.g., XAUUSDm). TP/SL are absolute price values.',
        },
        {
            id: 'limit-orders',
            title: '2. Limit & Stop Orders',
            description: 'Place pending orders that execute when price reaches your level.',
            difficulty: 'Basic',
            icon: <Target className="h-5 w-5" />,
            features: ['Pending orders', 'Entry price', 'Buy/Sell Limit & Stop'],
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "EURUSD",
  "action": "buy_limit",
  "quantity": 0.1,
  "price": 1.0850,
  "stop_loss": 1.0800,
  "take_profit": 1.0950,
  "comment": "Limit_Order"
}`,
            notes: 'Actions: buy_limit, sell_limit, buy_stop, sell_stop. Price is required for pending orders.',
        },
        // INTERMEDIATE
        {
            id: 'ma-crossover',
            title: '3. MA Crossover Strategy',
            description: 'Classic Moving Average crossover strategy with TradingView alerts.',
            difficulty: 'Intermediate',
            icon: <Activity className="h-5 w-5" />,
            features: ['Pine Script strategy', 'Auto TP/SL calculation', 'Trend following'],
            pineScript: `//@version=5
strategy("MA Crossover Webhook", overlay=true)

// Settings
fastLen = input.int(10, "Fast MA")
slowLen = input.int(20, "Slow MA")
tpPips = input.float(50, "TP Pips")
slPips = input.float(25, "SL Pips")

// Calculate MAs
fastMA = ta.sma(close, fastLen)
slowMA = ta.sma(close, slowLen)

// Entry conditions
longCondition = ta.crossover(fastMA, slowMA)
shortCondition = ta.crossunder(fastMA, slowMA)

// Calculate TP/SL as numbers (not expressions!)
longTP = math.round(close + tpPips * syminfo.mintick * 10, 5)
longSL = math.round(close - slPips * syminfo.mintick * 10, 5)
shortTP = math.round(close - tpPips * syminfo.mintick * 10, 5)
shortSL = math.round(close + slPips * syminfo.mintick * 10, 5)

// Alerts with calculated values
if longCondition
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"buy","quantity":0.1,"take_profit":' + str.tostring(longTP) + ',"stop_loss":' + str.tostring(longSL) + ',"comment":"MA_Cross"}', alert.freq_once_per_bar)
    
if shortCondition
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"sell","quantity":0.1,"take_profit":' + str.tostring(shortTP) + ',"stop_loss":' + str.tostring(shortSL) + ',"comment":"MA_Cross"}', alert.freq_once_per_bar)`,
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "{{ticker}}",
  "action": "buy",
  "quantity": 0.1,
  "take_profit": 2650.50,
  "stop_loss": 2625.25,
  "comment": "MA_Cross"
}`,
            notes: 'The Pine Script calculates TP/SL as numbers using str.tostring(). Replace YOUR_SECRET with your webhook secret.',
        },
        {
            id: 'rsi-reversal',
            title: '4. RSI Reversal Signals',
            description: 'Trade RSI oversold/overbought reversals with confirmation.',
            difficulty: 'Intermediate',
            icon: <BarChart2 className="h-5 w-5" />,
            features: ['RSI indicator', 'Overbought/Oversold', 'Reversal signals'],
            pineScript: `//@version=5
indicator("RSI Reversal Webhook", overlay=true)

rsiLen = input.int(14, "RSI Length")
obLevel = input.int(70, "Overbought")
osLevel = input.int(30, "Oversold")

rsi = ta.rsi(close, rsiLen)

// Detect reversals from extreme levels
longSignal = ta.crossover(rsi, osLevel)   // RSI crosses above oversold
shortSignal = ta.crossunder(rsi, obLevel) // RSI crosses below overbought

if longSignal
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"buy","quantity":0.1,"comment":"RSI_Reversal"}', alert.freq_once_per_bar)
    
if shortSignal
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"sell","quantity":0.1,"comment":"RSI_Reversal"}', alert.freq_once_per_bar)`,
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "GBPUSD",
  "action": "buy",
  "quantity": 0.1,
  "comment": "RSI_Reversal"
}`,
            notes: 'RSI reversals work best in ranging markets. Add TP/SL based on ATR or fixed pips.',
        },
        {
            id: 'breakout',
            title: '5. Breakout Strategy',
            description: 'Trade breakouts from consolidation zones with dynamic levels.',
            difficulty: 'Intermediate',
            icon: <Zap className="h-5 w-5" />,
            features: ['Dynamic high/low', 'Breakout detection', 'Momentum trades'],
            pineScript: `//@version=5
indicator("Breakout Webhook", overlay=true)

lookback = input.int(20, "Lookback Period")

// Calculate recent high/low
highestHigh = ta.highest(high, lookback)
lowestLow = ta.lowest(low, lookback)

// Breakout conditions
bullBreakout = close > highestHigh[1]
bearBreakout = close < lowestLow[1]

// Calculate TP/SL based on range
range = highestHigh - lowestLow
tp = math.round(close + range, 5)
sl = math.round(close - range * 0.5, 5)

if bullBreakout
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"buy","quantity":0.1,"take_profit":' + str.tostring(tp) + ',"stop_loss":' + str.tostring(sl) + ',"comment":"Breakout"}', alert.freq_once_per_bar)`,
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "USDJPY",
  "action": "buy",
  "quantity": 0.1,
  "take_profit": 151.50,
  "stop_loss": 150.25,
  "comment": "Breakout"
}`,
            notes: 'Range-based TP/SL adjusts to market volatility automatically.',
        },
        {
            id: 'support-resistance',
            title: '6. Support/Resistance Trading',
            description: 'Enter trades at key support and resistance levels.',
            difficulty: 'Intermediate',
            icon: <Layers className="h-5 w-5" />,
            features: ['Manual levels', 'Bounce trading', 'Key zones'],
            pineScript: `//@version=5
indicator("S/R Level Webhook", overlay=true)

// Define your levels manually
supportLevel = input.float(2600, "Support Level")
resistanceLevel = input.float(2700, "Resistance Level")
buffer = input.float(5, "Buffer (pips)")

// Price touching levels
atSupport = low <= supportLevel + buffer and close > supportLevel
atResistance = high >= resistanceLevel - buffer and close < resistanceLevel

if atSupport
    tp = math.round(supportLevel + (resistanceLevel - supportLevel) * 0.5, 2)
    sl = math.round(supportLevel - 20, 2)
    alert('{"secret":"YOUR_SECRET","symbol":"XAUUSD","action":"buy","quantity":0.1,"take_profit":' + str.tostring(tp) + ',"stop_loss":' + str.tostring(sl) + ',"comment":"Support_Bounce"}', alert.freq_once_per_bar)`,
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "XAUUSD",
  "action": "buy",
  "quantity": 0.1,
  "take_profit": 2650,
  "stop_loss": 2580,
  "comment": "Support_Bounce"
}`,
            notes: 'Update support/resistance levels manually in Pine Script as market evolves.',
        },
        // ADVANCED
        {
            id: 'trailing-stop',
            title: '7. Trailing Stop Strategy',
            description: 'Let EA manage trailing stop for maximum profit capture.',
            difficulty: 'Advanced',
            icon: <ArrowUpRight className="h-5 w-5" />,
            features: ['EA-managed trailing', 'Lock in profits', 'Dynamic exit'],
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "EURUSD",
  "action": "buy",
  "quantity": 0.1,
  "stop_loss": 1.0800,
  "trailing_stop": 30,
  "comment": "Trailing_Trade"
}`,
            notes: 'trailing_stop is in pips. EA will move SL to lock in profits as price moves favorably. Requires EA update.',
        },
        {
            id: 'partial-close',
            title: '8. Partial Close Signals',
            description: 'Take partial profits while leaving position open for more.',
            difficulty: 'Advanced',
            icon: <Percent className="h-5 w-5" />,
            features: ['Reduce position', 'Scale out', 'Secure profits'],
            pineScript: `//@version=5
indicator("Partial Close Webhook", overlay=true)

// Close 50% at first target
firstTarget = input.float(50, "First Target Pips") * syminfo.mintick * 10
entryPrice = input.float(0, "Entry Price")

hitTarget = high >= entryPrice + firstTarget

if hitTarget and entryPrice > 0
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"close_partial","quantity":0.05,"comment":"Partial_TP1"}', alert.freq_once_per_bar)`,
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "XAUUSD",
  "action": "close_partial",
  "quantity": 0.05,
  "comment": "Partial_TP1"
}`,
            notes: 'action: close_partial reduces position by the specified quantity. Use to scale out of winning trades.',
        },
        {
            id: 'multi-timeframe',
            title: '9. Multi-Timeframe Confirmation',
            description: 'Combine signals from multiple timeframes for higher probability.',
            difficulty: 'Advanced',
            icon: <Layers className="h-5 w-5" />,
            features: ['HTF trend filter', 'LTF entry', 'Confluence'],
            pineScript: `//@version=5
indicator("MTF Confirmation", overlay=true)

// Higher timeframe trend (use request.security)
htfMA = request.security(syminfo.tickerid, "240", ta.sma(close, 50))
htfTrendUp = close > htfMA

// Lower timeframe entry
ltfFastMA = ta.sma(close, 10)
ltfSlowMA = ta.sma(close, 20)
ltfCrossUp = ta.crossover(ltfFastMA, ltfSlowMA)

// Combined signal: HTF trend + LTF entry
longSignal = htfTrendUp and ltfCrossUp

if longSignal
    alert('{"secret":"YOUR_SECRET","symbol":"' + syminfo.ticker + '","action":"buy","quantity":0.1,"comment":"MTF_Long"}', alert.freq_once_per_bar)`,
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "GBPUSD",
  "action": "buy",
  "quantity": 0.1,
  "comment": "MTF_Long"
}`,
            notes: 'Use 4H for trend direction, 15M for entry timing. request.security() fetches higher timeframe data.',
        },
        {
            id: 'risk-position-sizing',
            title: '10. Risk-Based Position Sizing',
            description: 'Calculate lot size based on percentage risk per trade.',
            difficulty: 'Advanced',
            icon: <AlertTriangle className="h-5 w-5" />,
            features: ['% risk calculation', 'EA handles sizing', 'Consistent risk'],
            jsonTemplate: `{
  "secret": "${webhookSecret}",
  "symbol": "EURUSD",
  "action": "buy",
  "risk_percent": 1,
  "stop_loss": 1.0850,
  "take_profit": 1.0950,
  "comment": "Risk_Trade"
}`,
            notes: 'risk_percent: EA calculates lot size based on account balance and SL distance. Requires EA update. Example: 1% = risk 1% of balance on this trade.',
        },
    ];

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'Basic':
                return 'bg-green-100 text-green-800';
            case 'Intermediate':
                return 'bg-yellow-100 text-yellow-800';
            case 'Advanced':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 overflow-auto p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">TradingView Use Cases</h1>
                        <p className="mt-2 text-gray-600">
                            Step-by-step examples for connecting TradingView strategies to MT4/MT5
                        </p>
                    </div>

                    {/* Important Note */}
                    <Card className="mb-8 border-yellow-200 bg-yellow-50">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-yellow-800">Important JSON Rules</p>
                                    <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                                        <li>• <strong>No math operations</strong> in JSON (e.g., <code className="bg-yellow-100 px-1 rounded">{'{{close}} * 1.02'}</code> is invalid)</li>
                                        <li>• Use <strong>str.tostring()</strong> in Pine Script to convert numbers</li>
                                        <li>• TP/SL must be <strong>absolute price values</strong>, not offsets</li>
                                        <li>• Use your broker&apos;s exact symbol (e.g., <code className="bg-yellow-100 px-1 rounded">XAUUSDm</code> not <code className="bg-yellow-100 px-1 rounded">XAUUSD</code>)</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Use Cases */}
                    <div className="space-y-4">
                        {useCases.map((useCase) => (
                            <Card key={useCase.id} className="overflow-hidden">
                                <button
                                    onClick={() => setExpandedCase(expandedCase === useCase.id ? null : useCase.id)}
                                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            {useCase.icon}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-semibold text-gray-900">{useCase.title}</h3>
                                            <p className="text-sm text-gray-500">{useCase.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={getDifficultyColor(useCase.difficulty)}>
                                            {useCase.difficulty}
                                        </Badge>
                                        {expandedCase === useCase.id ? (
                                            <ChevronUp className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {expandedCase === useCase.id && (
                                    <CardContent className="border-t bg-gray-50 space-y-4">
                                        {/* Features */}
                                        <div className="flex flex-wrap gap-2">
                                            {useCase.features.map((feature, idx) => (
                                                <Badge key={idx} variant="outline" className="bg-white">
                                                    {feature}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Pine Script (if available) */}
                                        {useCase.pineScript && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-gray-700">Pine Script</h4>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => copyToClipboard(useCase.pineScript!, `pine-${useCase.id}`)}
                                                        className="h-8"
                                                    >
                                                        {copied === `pine-${useCase.id}` ? (
                                                            <>
                                                                <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                                                                Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-4 w-4 mr-1" />
                                                                Copy Script
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                                                    {useCase.pineScript}
                                                </pre>
                                            </div>
                                        )}

                                        {/* JSON Template */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-gray-700">Webhook JSON</h4>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => copyToClipboard(useCase.jsonTemplate, `json-${useCase.id}`)}
                                                    className="h-8"
                                                >
                                                    {copied === `json-${useCase.id}` ? (
                                                        <>
                                                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-4 w-4 mr-1" />
                                                            Copy JSON
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                                                {useCase.jsonTemplate}
                                            </pre>
                                        </div>

                                        {/* Notes */}
                                        {useCase.notes && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-sm text-blue-800">
                                                    <strong>💡 Tip:</strong> {useCase.notes}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>

                    {/* Webhook URL Reference */}
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle className="text-lg">Your Webhook URL</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
                                <code className="text-sm break-all">
                                    https://signals.myalgostack.com/api/v1/webhook/tradingview
                                </code>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(
                                        'https://signals.myalgostack.com/api/v1/webhook/tradingview',
                                        'webhook-url'
                                    )}
                                    className="ml-2 shrink-0"
                                >
                                    {copied === 'webhook-url' ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Paste this URL in TradingView&apos;s alert Notifications tab → Webhook URL
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
