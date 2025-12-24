'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Monitor,
  Settings,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://signals.myalgostack.com/api/v1';

export default function DownloadPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, fetchUser, user } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('mt4');

  useEffect(() => {
    const checkAuth = async () => {
      await fetchUser();
      setAuthChecked(true);
    };
    checkAuth();
  }, [fetchUser]);

  useEffect(() => {
    if (authChecked && !authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authChecked, authLoading, isAuthenticated, router]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!authChecked || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Expert Advisor Download</h1>
          <p className="text-gray-600 mb-8">
            Download and install the Signal Bridge EA to receive trading signals in MetaTrader
          </p>

          {/* Download Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* MT4 Download */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-blue-600" />
                    MetaTrader 4
                  </CardTitle>
                  <Badge>v1.0.0</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Download the Signal Bridge EA for MT4. Compatible with all MT4 brokers.
                </p>
                <a
                  href="/downloads/SignalBridge.ex4"
                  download="SignalBridge.ex4"
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download for MT4
                </a>
              </CardContent>
            </Card>

            {/* MT5 Download */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-purple-600" />
                    MetaTrader 5
                  </CardTitle>
                  <Badge variant="secondary">v1.0.0</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Download the Signal Bridge EA for MT5. Full support for MT5 features.
                </p>
                <a
                  href="/downloads/SignalBridge.ex5"
                  download="SignalBridge.ex5"
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download for MT5
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Your Configuration */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Your Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Use these settings when configuring the EA in MetaTrader. You can find your API keys in the Accounts page.
              </p>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Server URL</span>
                    <button
                      onClick={() => copyToClipboard(API_URL.replace('/api/v1', ''), 'server')}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {copied === 'server' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="text-sm">{copied === 'server' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded block break-all">
                    {API_URL}
                  </code>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Webhook Secret</span>
                    <button
                      onClick={() => copyToClipboard(user?.webhook_secret || '', 'webhook')}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {copied === 'webhook' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="text-sm">{copied === 'webhook' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded block break-all font-mono">
                    {user?.webhook_secret || 'Loading...'}
                  </code>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">API Key Required</p>
                      <p className="text-sm text-yellow-700">
                        Go to the{' '}
                        <a href="/accounts" className="underline font-medium">
                          Accounts page
                        </a>{' '}
                        to create an MT account and get your API key.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installation Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Installation & Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* MT4 Instructions */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('mt4')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-blue-600" />
                    MetaTrader 4 Installation
                  </span>
                  {expandedSection === 'mt4' ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSection === 'mt4' && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium">Download the EA file</p>
                          <p className="text-sm text-gray-600">
                            Click the "Download for MT4" button above to download SignalBridge.ex4
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Open MetaTrader 4 Data Folder</p>
                          <p className="text-sm text-gray-600">
                            In MT4, go to <code className="bg-gray-100 px-1 rounded">File → Open Data Folder</code>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium">Copy EA to Experts folder</p>
                          <p className="text-sm text-gray-600">
                            Navigate to <code className="bg-gray-100 px-1 rounded">MQL4/Experts</code> and paste the downloaded file
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium shrink-0">
                          4
                        </div>
                        <div>
                          <p className="font-medium">Ready to Use</p>
                          <p className="text-sm text-gray-600">
                            The .ex4 file is pre-compiled and ready to use. No compilation needed.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium shrink-0">
                          5
                        </div>
                        <div>
                          <p className="font-medium">Refresh Navigator</p>
                          <p className="text-sm text-gray-600">
                            In MT4, right-click on "Expert Advisors" in Navigator and select "Refresh"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium shrink-0">
                          6
                        </div>
                        <div>
                          <p className="font-medium">Enable AutoTrading</p>
                          <p className="text-sm text-gray-600">
                            Click "AutoTrading" button in toolbar or go to <code className="bg-gray-100 px-1 rounded">Tools → Options → Expert Advisors</code> and enable:
                          </p>
                          <ul className="text-sm text-gray-600 list-disc ml-4 mt-1">
                            <li>Allow automated trading</li>
                            <li>Allow WebRequest for listed URL (add your server URL)</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium shrink-0">
                          7
                        </div>
                        <div>
                          <p className="font-medium">Attach EA to Chart</p>
                          <p className="text-sm text-gray-600">
                            Drag SignalBridge from Navigator to any chart. Enter your API Key in the settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* MT5 Instructions */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('mt5')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-purple-600" />
                    MetaTrader 5 Installation
                  </span>
                  {expandedSection === 'mt5' ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSection === 'mt5' && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-medium shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium">Download the EA file</p>
                          <p className="text-sm text-gray-600">
                            Click the "Download for MT5" button above to download SignalBridge.ex5
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-medium shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Open MetaTrader 5 Data Folder</p>
                          <p className="text-sm text-gray-600">
                            In MT5, go to <code className="bg-gray-100 px-1 rounded">File → Open Data Folder</code>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-medium shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium">Copy EA to Experts folder</p>
                          <p className="text-sm text-gray-600">
                            Navigate to <code className="bg-gray-100 px-1 rounded">MQL5/Experts</code> and paste the downloaded file
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-medium shrink-0">
                          4
                        </div>
                        <div>
                          <p className="font-medium">Ready to Use</p>
                          <p className="text-sm text-gray-600">
                            The .ex5 file is pre-compiled and ready to use. No compilation needed.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-medium shrink-0">
                          5
                        </div>
                        <div>
                          <p className="font-medium">Enable Algo Trading</p>
                          <p className="text-sm text-gray-600">
                            Go to <code className="bg-gray-100 px-1 rounded">Tools → Options → Expert Advisors</code> and enable:
                          </p>
                          <ul className="text-sm text-gray-600 list-disc ml-4 mt-1">
                            <li>Allow Algo Trading</li>
                            <li>Allow WebRequest for listed URL (add your server URL)</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm font-medium shrink-0">
                          6
                        </div>
                        <div>
                          <p className="font-medium">Attach EA to Chart</p>
                          <p className="text-sm text-gray-600">
                            Drag SignalBridge from Navigator to any chart. Configure the inputs with your API Key.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* EA Configuration */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('config')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-600" />
                    EA Configuration Settings
                  </span>
                  {expandedSection === 'config' ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSection === 'config' && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600 mb-4">
                      When you attach the EA to a chart, you'll see these configurable parameters:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-2 px-3 font-medium">Parameter</th>
                            <th className="text-left py-2 px-3 font-medium">Default</th>
                            <th className="text-left py-2 px-3 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">ServerURL</td>
                            <td className="py-2 px-3 text-gray-600 font-mono text-xs">https://signals.myalgostack.com/api/v1</td>
                            <td className="py-2 px-3 text-gray-600">Pre-configured server URL (no change needed)</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">ApiKey</td>
                            <td className="py-2 px-3 text-gray-600">-</td>
                            <td className="py-2 px-3 text-gray-600">Your MT account API key (from Accounts page)</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">PollIntervalSec</td>
                            <td className="py-2 px-3 text-gray-600">2</td>
                            <td className="py-2 px-3 text-gray-600">How often to check for new signals (seconds)</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">MaxLotSize</td>
                            <td className="py-2 px-3 text-gray-600">1.0</td>
                            <td className="py-2 px-3 text-gray-600">Maximum allowed lot size per trade</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">DefaultLotSize</td>
                            <td className="py-2 px-3 text-gray-600">0.1</td>
                            <td className="py-2 px-3 text-gray-600">Default lot size if not specified in signal</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">Slippage</td>
                            <td className="py-2 px-3 text-gray-600">3</td>
                            <td className="py-2 px-3 text-gray-600">Maximum allowed slippage in points</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">MagicNumber</td>
                            <td className="py-2 px-3 text-gray-600">123456</td>
                            <td className="py-2 px-3 text-gray-600">Unique identifier for EA trades</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">EnableTakeProfit</td>
                            <td className="py-2 px-3 text-gray-600">true</td>
                            <td className="py-2 px-3 text-gray-600">Enable take profit from signals</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3 font-mono">EnableStopLoss</td>
                            <td className="py-2 px-3 text-gray-600">true</td>
                            <td className="py-2 px-3 text-gray-600">Enable stop loss from signals</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-mono">EnableLogging</td>
                            <td className="py-2 px-3 text-gray-600">true</td>
                            <td className="py-2 px-3 text-gray-600">Enable detailed logging in Experts tab</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* TradingView Setup */}
              <div className="border rounded-lg">
                <button
                  onClick={() => toggleSection('tradingview')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <span className="font-medium flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-orange-600" />
                    TradingView Webhook Setup
                  </span>
                  {expandedSection === 'tradingview' ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                {expandedSection === 'tradingview' && (
                  <div className="px-4 pb-4 space-y-4">
                    <p className="text-sm text-gray-600">
                      To send alerts from TradingView to Signal Bridge:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm font-medium shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium">Create an Alert in TradingView</p>
                          <p className="text-sm text-gray-600">
                            Click on "Alerts" and create a new alert on your indicator or strategy
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm font-medium shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium">Set Webhook URL</p>
                          <p className="text-sm text-gray-600">
                            In the "Notifications" tab, enable "Webhook URL" and enter:
                          </p>
                          <div className="bg-gray-100 p-2 rounded mt-2 flex items-center justify-between">
                            <code className="text-sm break-all">
                              {API_URL}/webhook/tradingview
                            </code>
                            <button
                              onClick={() => copyToClipboard(
                                `${API_URL}/webhook/tradingview`,
                                'tvwebhook'
                              )}
                              className="ml-2 text-blue-600 hover:text-blue-800 shrink-0"
                            >
                              {copied === 'tvwebhook' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Note: The secret is included in the message body, not in the URL
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm font-medium shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium">Set Alert Message (JSON)</p>
                          <p className="text-sm text-gray-600">
                            In the &quot;Message&quot; field, paste this exact JSON (replace YOUR_SYMBOL with your broker&apos;s symbol):
                          </p>
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded mt-2 text-xs overflow-x-auto">
                            {`{
  "secret": "${user?.webhook_secret || 'YOUR_WEBHOOK_SECRET'}",
  "symbol": "XAUUSD",
  "action": "buy",
  "quantity": 0.1,
  "comment": "TradingView"
}`}
                          </pre>
                          <p className="text-xs text-yellow-600 mt-2 font-medium">
                            ⚠️ Important: Do NOT use math operations like &quot;{`{{ close }} * 1.02`}&quot; - they are invalid in JSON!
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Tip: Use your broker&apos;s exact symbol (e.g., XAUUSDm instead of XAUUSD if that&apos;s what MT4 shows)
                          </p>
                          <button
                            onClick={() => copyToClipboard(
                              `{
  "secret": "${user?.webhook_secret || 'YOUR_WEBHOOK_SECRET'}",
  "symbol": "XAUUSD",
  "action": "buy",
  "quantity": 0.1,
  "comment": "TradingView"
}`,
                              'alertjson'
                            )}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            {copied === 'alertjson' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            <span>{copied === 'alertjson' ? 'Copied!' : 'Copy JSON'}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-sm font-medium shrink-0">
                          4
                        </div>
                        <div>
                          <p className="font-medium">Available Actions</p>
                          <p className="text-sm text-gray-600">
                            Use these values for the "action" field:
                          </p>
                          <ul className="text-sm text-gray-600 list-disc ml-4 mt-1">
                            <li><code className="bg-gray-100 px-1 rounded">buy</code> - Open market buy order</li>
                            <li><code className="bg-gray-100 px-1 rounded">sell</code> - Open market sell order</li>
                            <li><code className="bg-gray-100 px-1 rounded">buy_limit</code> / <code className="bg-gray-100 px-1 rounded">sell_limit</code> - Limit orders</li>
                            <li><code className="bg-gray-100 px-1 rounded">buy_stop</code> / <code className="bg-gray-100 px-1 rounded">sell_stop</code> - Stop orders</li>
                            <li><code className="bg-gray-100 px-1 rounded">close</code> - Close all positions for symbol</li>
                            <li><code className="bg-gray-100 px-1 rounded">close_partial</code> - Partial close</li>
                            <li><code className="bg-gray-100 px-1 rounded">modify</code> - Modify TP/SL</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">EA not appearing in Navigator?</p>
                  <p className="text-sm text-gray-600">
                    Make sure the file is in the correct folder (MQL4/Experts or MQL5/Experts) and refresh the Navigator.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Connection errors?</p>
                  <p className="text-sm text-gray-600">
                    Check that you've added the server URL to the allowed WebRequest URLs in MT4/MT5 options.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Trades not executing?</p>
                  <p className="text-sm text-gray-600">
                    Verify that AutoTrading is enabled, the EA shows a smiley face, and your API key is correct.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Symbol not found?</p>
                  <p className="text-sm text-gray-600">
                    TradingView symbols may differ from your broker's. Use Symbol Mappings in the Accounts page to map them.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
