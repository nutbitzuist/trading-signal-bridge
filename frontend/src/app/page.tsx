'use client';

import Link from 'next/link';
import {
  Zap,
  Shield,
  Clock,
  BarChart3,
  ArrowRight,
  Check,
  X,
  Webhook,
  Monitor,
  TrendingUp,
  Settings,
  AlertTriangle,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b-3 border-black bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 border-2 border-black flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Signal Bridge</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="font-medium hover:text-emerald-600 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="bg-emerald-500 text-white font-bold px-4 py-2 border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-white border-b-3 border-black">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
            Automate Your Trading.
            <br />
            <span className="text-emerald-500">Execute Signals Instantly.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect TradingView alerts directly to MetaTrader 4 & 5.
            No VPS required. No coding needed. Just pure automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href="/auth/register"
              className="bg-emerald-500 text-white font-bold text-lg px-8 py-4 border-3 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/use-cases"
              className="bg-white font-bold text-lg px-8 py-4 border-3 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              See Use Cases
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              No Credit Card Required
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              Works With Any Broker
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              MT4 & MT5 Supported
            </span>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-gray-100 border-b-3 border-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-12">
            Stop Missing Trades
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 border-3 border-black shadow-[4px_4px_0_0_#000]">
              <div className="w-12 h-12 bg-red-100 border-2 border-black flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Manual Execution</h3>
              <p className="text-gray-600">
                By the time you see an alert and open MT4, the market has already moved against you.
              </p>
            </div>
            <div className="bg-white p-6 border-3 border-black shadow-[4px_4px_0_0_#000]">
              <div className="w-12 h-12 bg-red-100 border-2 border-black flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Expensive VPS</h3>
              <p className="text-gray-600">
                Running 24/7 servers just to bridge alerts? That's $50-200/month you shouldn't pay.
              </p>
            </div>
            <div className="bg-white p-6 border-3 border-black shadow-[4px_4px_0_0_#000]">
              <div className="w-12 h-12 bg-red-100 border-2 border-black flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Complex Tools</h3>
              <p className="text-gray-600">
                Most automation tools require programming skills and hours of configuration.
              </p>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-block bg-emerald-500 text-white font-bold px-6 py-3 border-3 border-black shadow-[4px_4px_0_0_#000]">
              Signal Bridge solves all of this →
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white border-b-3 border-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-4">
            How It Works
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Get started in under 5 minutes
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500 border-3 border-black mx-auto mb-4 flex items-center justify-center text-white font-black text-2xl shadow-[4px_4px_0_0_#000]">
                1
              </div>
              <h3 className="font-bold text-xl mb-2">Connect</h3>
              <p className="text-gray-600">
                Set up your TradingView webhook URL. Copy your unique secret key from the dashboard.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500 border-3 border-black mx-auto mb-4 flex items-center justify-center text-white font-black text-2xl shadow-[4px_4px_0_0_#000]">
                2
              </div>
              <h3 className="font-bold text-xl mb-2">Configure</h3>
              <p className="text-gray-600">
                Download the EA, add your API key, and attach it to any chart. That's it.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500 border-3 border-black mx-auto mb-4 flex items-center justify-center text-white font-black text-2xl shadow-[4px_4px_0_0_#000]">
                3
              </div>
              <h3 className="font-bold text-xl mb-2">Trade</h3>
              <p className="text-gray-600">
                Signals from TradingView execute automatically in milliseconds. Watch your trades execute.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-gray-100 border-b-3 border-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-12">
            Built for Serious Traders
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Webhook, title: 'TradingView Webhooks', desc: 'Direct integration with TradingView alerts via secure webhooks.' },
              { icon: Monitor, title: 'MT4 & MT5 Support', desc: 'Native Expert Advisors for both MetaTrader platforms.' },
              { icon: Zap, title: 'Sub-second Execution', desc: 'Signals execute in milliseconds, not minutes.' },
              { icon: Shield, title: 'Risk-Based Sizing', desc: 'Automatic lot calculation based on % risk per trade.' },
              { icon: TrendingUp, title: 'Trailing Stop', desc: 'Automatic trailing stop to lock in profits as price moves.' },
              { icon: Shield, title: 'Break-Even Protection', desc: 'Auto-move stop loss to entry after reaching profit target.' },
              { icon: Clock, title: 'Time & Spread Filters', desc: 'Only trade during optimal hours with tight spreads.' },
              { icon: Shield, title: 'Equity Protection', desc: 'Stop trading when equity drops below your threshold.' },
              { icon: BarChart3, title: 'Max Trade Limits', desc: 'Limit maximum open positions to manage risk exposure.' },
              { icon: Clock, title: 'Weekend Close', desc: 'Automatically close all positions before weekend gaps.' },
              { icon: Shield, title: 'Daily Drawdown Limit', desc: 'Block new trades when daily loss limit is reached.' },
              { icon: AlertTriangle, title: 'Symbol Whitelist', desc: 'Restrict trading to specific symbols you approve.' },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-6 border-3 border-black shadow-[4px_4px_0_0_#000]">
                <div className="w-12 h-12 bg-emerald-100 border-2 border-black flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-white border-b-3 border-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-12">
            Why Signal Bridge?
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-3 border-black">
              <thead>
                <tr className="border-b-3 border-black">
                  <th className="p-4 text-left font-bold bg-gray-100">Feature</th>
                  <th className="p-4 text-center font-bold bg-emerald-500 text-white border-l-3 border-black">Signal Bridge</th>
                  <th className="p-4 text-center font-bold bg-gray-100 border-l-3 border-black">Manual Trading</th>
                  <th className="p-4 text-center font-bold bg-gray-100 border-l-3 border-black">Other Tools</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Webhook Support', true, false, true],
                  ['MT4/MT5 Native EA', true, false, false],
                  ['Risk-Based Sizing', true, false, false],
                  ['Trailing Stop Built-in', true, false, false],
                  ['No VPS Required', true, true, false],
                  ['Free Tier Available', true, true, false],
                  ['Setup Time', '5 min', 'N/A', '2+ hours'],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-black last:border-b-0">
                    <td className="p-4 font-medium">{row[0]}</td>
                    <td className="p-4 text-center bg-emerald-50 border-l-3 border-black">
                      {typeof row[1] === 'boolean' ? (
                        row[1] ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="font-bold text-emerald-600">{row[1]}</span>
                      )}
                    </td>
                    <td className="p-4 text-center border-l-3 border-black">
                      {typeof row[2] === 'boolean' ? (
                        row[2] ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-gray-600">{row[2]}</span>
                      )}
                    </td>
                    <td className="p-4 text-center border-l-3 border-black">
                      {typeof row[3] === 'boolean' ? (
                        row[3] ? <Check className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />
                      ) : (
                        <span className="text-gray-600">{row[3]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-emerald-500 border-b-3 border-black">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-6">
            Ready to Automate Your Trading?
          </h2>
          <p className="text-emerald-100 text-xl mb-8">
            Join thousands of traders saving hours every week with automated signal execution.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-white font-bold text-lg px-8 py-4 border-3 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[3px_3px_0_0_#000] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            Create Free Account
          </Link>
          <p className="text-emerald-100 text-sm mt-4">
            No credit card required • Setup in 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-black text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 border-2 border-white flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Signal Bridge</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <Link href="/download" className="hover:text-white transition-colors">Download EA</Link>
              <Link href="/use-cases" className="hover:text-white transition-colors">Use Cases</Link>
              <a href="mailto:support@example.com" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Signal Bridge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
