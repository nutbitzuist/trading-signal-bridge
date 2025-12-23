//+------------------------------------------------------------------+
//|                                               SignalBridge.mq5   |
//|                                    Trading Signal Bridge Client  |
//|                                  https://signals.myalgostack.com  |
//+------------------------------------------------------------------+
#property copyright "Trading Signal Bridge"
#property link      "https://signals.myalgostack.com"
#property version   "2.00"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\OrderInfo.mqh>

//--- Input Parameters
input string   ServerURL          = "https://signals.myalgostack.com/api/v1";  // Server URL (pre-configured)
input string   ApiKey             = "";                                  // API Key (from dashboard)
input int      PollIntervalSec    = 2;                                   // Poll interval (seconds)
input double   MaxLotSize         = 1.0;                                 // Maximum lot size
input double   DefaultLotSize     = 0.1;                                 // Default lot size
input ulong    Slippage           = 30;                                  // Slippage (points)
input ulong    MagicNumber        = 123456;                              // Magic number
input bool     EnableTakeProfit   = true;                                // Enable take profit
input bool     EnableStopLoss     = true;                                // Enable stop loss
input bool     EnableLogging      = true;                                // Enable detailed logging
input string   Group_Risk         = "=== Risk Management ===";           // Risk Management Settings
input bool     UseRiskBasedSizing = false;                               // Enable risk-based position sizing
input double   RiskPercent        = 1.0;                                 // Risk percent per trade
input double   MaxDailyLossPercent= 3.0;                                 // Max daily loss percent (0 to disable)
input bool     UseDailyDrawdown   = false;                               // Enable max daily drawdown protection
input int      MaxOpenTrades      = 0;                                   // Max open trades (0 = unlimited)
input double   MinEquityPercent   = 0;                                   // Min equity % to trade (0 = disabled)
input string   Group_Filters      = "=== Filters ===";                   // Filter Settings
input bool     UseTimeFilter      = false;                               // Enable time filter
input int      StartHour          = 8;                                   // Start hour (Server time)
input int      EndHour            = 20;                                  // End hour (Server time)
input double   MaxSpreadPips      = 5.0;                                 // Maximum allowed spread in pips
input bool     CloseBeforeWeekend = false;                               // Close all positions before weekend
input int      FridayCloseHour    = 22;                                  // Friday close hour (Server time)
input string   SymbolWhitelist    = "";                                  // Symbol whitelist (comma-separated, empty = all)
input string   Group_Trailing     = "=== Trailing Stop ===";             // Trailing Stop Settings
input int      TrailingStopPips   = 0;                                   // Trailing stop in pips (0 to disable)
input int      TrailingStepPips   = 5;                                   // Trailing step in pips
input string   Group_BreakEven    = "=== Break-Even ===";                // Break-Even Settings
input bool     UseBreakEven       = false;                               // Enable break-even stop
input int      BreakEvenPips      = 20;                                  // Pips in profit to activate break-even
input int      BreakEvenLockPips  = 2;                                   // Pips to lock above entry

//--- Global Variables
string         gPendingEndpoint;
string         gResultEndpoint;
int            gLastError = 0;
datetime       gLastPollTime = 0;
int            gConnectionErrors = 0;
const int      MAX_CONNECTION_ERRORS = 10;
double         gStartingEquity = 0;

//--- Trade objects
CTrade         Trade;
CPositionInfo  PositionInfo;
COrderInfo     OrderInfo;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   //--- Validate inputs
   if(StringLen(ApiKey) == 0)
   {
      Alert("SignalBridge: API Key is required!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   if(PollIntervalSec < 1)
   {
      Alert("SignalBridge: Poll interval must be at least 1 second!");
      return(INIT_PARAMETERS_INCORRECT);
   }

   //--- Build endpoints
   gPendingEndpoint = ServerURL + "/signals/pending?api_key=" + ApiKey;
   gResultEndpoint = ServerURL + "/signals/";

   //--- Configure trade object
   Trade.SetExpertMagicNumber(MagicNumber);
   Trade.SetDeviationInPoints(Slippage);
   Trade.SetTypeFilling(ORDER_FILLING_IOC);
   Trade.SetAsyncMode(false);

   //--- Test connection
   if(!TestConnection())
   {
      Alert("SignalBridge: Failed to connect to server. Check URL and API key.");
      return(INIT_FAILED);
   }

   //--- Start timer
   EventSetTimer(PollIntervalSec);

   Log("SignalBridge initialized successfully");
   Log("Server: " + ServerURL);
   Log("Poll interval: " + IntegerToString(PollIntervalSec) + " seconds");

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Log("SignalBridge deinitialized. Reason: " + IntegerToString(reason));
}

//+------------------------------------------------------------------+
//| Timer function - polls for new signals                             |
//+------------------------------------------------------------------+
void OnTimer()
{
   //--- Check if trading is allowed
   if(!MQLInfoInteger(MQL_TRADE_ALLOWED))
   {
      Log("Trading not allowed - skipping poll");
      return;
   }

   //--- Check connection error limit
   if(gConnectionErrors >= MAX_CONNECTION_ERRORS)
   {
      Log("Too many connection errors. Stopping EA.");
      ExpertRemove();
      return;
   }

   //--- Manage break-even stops
   ManageBreakEven();

   //--- Pool for trailing stop
   ManageTrailingStop();

   //--- Check weekend close
   CheckWeekendClose();

   //--- Poll for signals
   PollSignals();
}

//+------------------------------------------------------------------+
//| Poll server for pending signals                                    |
//+------------------------------------------------------------------+
void PollSignals()
{
   string response = "";
   int result = HttpGet(gPendingEndpoint, response);

   if(result != 200)
   {
      gConnectionErrors++;
      Log("Failed to poll signals. HTTP code: " + IntegerToString(result));
      return;
   }

   //--- Reset connection errors on success
   gConnectionErrors = 0;

   //--- Parse and process signals
   ProcessSignalsResponse(response);
}

//+------------------------------------------------------------------+
//| Process signals from server response                               |
//+------------------------------------------------------------------+
void ProcessSignalsResponse(string response)
{
   //--- Extract signals array
   string signalsJson = ExtractJsonValue(response, "signals");

   if(StringLen(signalsJson) <= 2) // Empty array "[]"
      return;

   //--- Parse each signal
   string signals[];
   int count = ParseJsonArray(signalsJson, signals);

   for(int i = 0; i < count; i++)
   {
      ProcessSignal(signals[i]);
   }
}

//+------------------------------------------------------------------+
//| Process a single signal                                            |
//+------------------------------------------------------------------+
void ProcessSignal(string signalJson)
{
   //--- Extract signal fields
   string signalId = ExtractJsonValue(signalJson, "id");
   string symbol = ExtractJsonValue(signalJson, "symbol");
   string action = ExtractJsonValue(signalJson, "action");
   string orderType = ExtractJsonValue(signalJson, "order_type");
   double quantity = StringToDouble(ExtractJsonValue(signalJson, "quantity"));
   double price = StringToDouble(ExtractJsonValue(signalJson, "price"));
   double takeProfit = StringToDouble(ExtractJsonValue(signalJson, "take_profit"));
   double stopLoss = StringToDouble(ExtractJsonValue(signalJson, "stop_loss"));
   string comment = ExtractJsonValue(signalJson, "comment");

   Log("Processing signal: " + signalId + " - " + symbol + " " + action);

   //--- Map symbol if needed
   string mtSymbol = MapSymbol(symbol);

   //--- Validate symbol exists
   if(!SymbolSelect(mtSymbol, true))
   {
      ReportResult(signalId, false, 0, 0, 0, 0, TRADE_RETCODE_ERROR, "Symbol not found: " + mtSymbol);
      return;
   }

   //--- Check filters
   if(!CheckFilters(mtSymbol))
   {
      ReportResult(signalId, false, 0, 0, 0, 0, TRADE_RETCODE_REJECT, "Trade blocked by filters");
      return;
   }

   //--- Determine lot size
   double lots = quantity;

   //--- Risk based sizing
   if(UseRiskBasedSizing)
   {
      double slDist = 0;
      if(stopLoss > 0)
         slDist = MathAbs(price - stopLoss);
      else if(action == "buy" && stopLoss > 0)
         slDist = MathAbs(price - stopLoss);
      else if(action == "sell" && stopLoss > 0)
         slDist = MathAbs(stopLoss - price);
         
      if(slDist > 0)
      {
         lots = CalculateRiskLots(mtSymbol, RiskPercent, slDist);
         Log("Risk-based sizing: " + DoubleToString(lots, 2) + " lots (" + DoubleToString(RiskPercent) + "%)");
      }
      else
      {
         Log("Warning: Cannot use risk-based sizing without Stop Loss. Using signal quantity.");
      }
   }

   if(lots <= 0) lots = DefaultLotSize;
   if(lots > MaxLotSize) lots = MaxLotSize;

   //--- Normalize lot size
   double minLot = SymbolInfoDouble(mtSymbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(mtSymbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(mtSymbol, SYMBOL_VOLUME_STEP);

   lots = MathMax(minLot, MathMin(maxLot, NormalizeDouble(lots / lotStep, 0) * lotStep));

   //--- Execute based on action
   ulong ticket = 0;
   double executedPrice = 0;
   uint errorCode = 0;
   string errorMsg = "";

   datetime startTime = TimeLocal();

   if(action == "buy" || action == "sell")
   {
      ticket = ExecuteMarketOrder(mtSymbol, action, lots, takeProfit, stopLoss, comment, executedPrice, errorCode, errorMsg);
   }
   else if(action == "buy_limit" || action == "sell_limit" || action == "buy_stop" || action == "sell_stop")
   {
      ticket = ExecutePendingOrder(mtSymbol, action, lots, price, takeProfit, stopLoss, comment, errorCode, errorMsg);
      executedPrice = price;
   }
   else if(action == "close")
   {
      ticket = ClosePositions(mtSymbol, comment, executedPrice, errorCode, errorMsg);
   }
   else if(action == "close_partial")
   {
      ticket = ClosePartialPosition(mtSymbol, lots, comment, executedPrice, errorCode, errorMsg);
   }
   else if(action == "modify")
   {
      ticket = ModifyPosition(mtSymbol, takeProfit, stopLoss, errorCode, errorMsg);
   }
   else
   {
      errorCode = TRADE_RETCODE_INVALID;
      errorMsg = "Unknown action: " + action;
   }

   int executionTimeMs = (int)((TimeLocal() - startTime) * 1000);

   //--- Report result
   ReportResult(signalId, ticket > 0, ticket, executedPrice, lots, executionTimeMs, errorCode, errorMsg);
}

//+------------------------------------------------------------------+
//| Execute market order (buy/sell)                                    |
//+------------------------------------------------------------------+
ulong ExecuteMarketOrder(string symbol, string action, double lots, double tp, double sl,
                         string comment, double &executedPrice, uint &errorCode, string &errorMsg)
{
   ENUM_ORDER_TYPE orderType = (action == "buy") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   //--- Calculate prices
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double price = (orderType == ORDER_TYPE_BUY) ? ask : bid;

   double tpPrice = 0;
   double slPrice = 0;

   if(EnableTakeProfit && tp > 0)
      tpPrice = NormalizeDouble(tp, digits);

   if(EnableStopLoss && sl > 0)
      slPrice = NormalizeDouble(sl, digits);

   //--- Execute order
   bool success;
   if(orderType == ORDER_TYPE_BUY)
      success = Trade.Buy(lots, symbol, price, slPrice, tpPrice, comment);
   else
      success = Trade.Sell(lots, symbol, price, slPrice, tpPrice, comment);

   if(success)
   {
      MqlTradeResult result;
      Trade.Result(result);

      if(result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)
      {
         executedPrice = result.price;
         Log("Order executed: Deal=" + IntegerToString(result.deal) +
             " Order=" + IntegerToString(result.order) +
             " Price=" + DoubleToString(executedPrice, digits));
         return result.order;
      }
      else
      {
         errorCode = result.retcode;
         errorMsg = Trade.ResultRetcodeDescription();
         Log("Order failed: " + errorMsg);
         return 0;
      }
   }
   else
   {
      errorCode = Trade.ResultRetcode();
      errorMsg = Trade.ResultRetcodeDescription();
      Log("Order failed: " + errorMsg);
      return 0;
   }
}

//+------------------------------------------------------------------+
//| Execute pending order                                              |
//+------------------------------------------------------------------+
ulong ExecutePendingOrder(string symbol, string action, double lots, double price,
                          double tp, double sl, string comment, uint &errorCode, string &errorMsg)
{
   ENUM_ORDER_TYPE orderType;

   if(action == "buy_limit") orderType = ORDER_TYPE_BUY_LIMIT;
   else if(action == "sell_limit") orderType = ORDER_TYPE_SELL_LIMIT;
   else if(action == "buy_stop") orderType = ORDER_TYPE_BUY_STOP;
   else if(action == "sell_stop") orderType = ORDER_TYPE_SELL_STOP;
   else
   {
      errorCode = TRADE_RETCODE_INVALID;
      errorMsg = "Invalid pending order type";
      return 0;
   }

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   price = NormalizeDouble(price, digits);

   double tpPrice = 0;
   double slPrice = 0;

   if(EnableTakeProfit && tp > 0)
      tpPrice = NormalizeDouble(tp, digits);

   if(EnableStopLoss && sl > 0)
      slPrice = NormalizeDouble(sl, digits);

   bool success;

   if(orderType == ORDER_TYPE_BUY_LIMIT)
      success = Trade.BuyLimit(lots, price, symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, comment);
   else if(orderType == ORDER_TYPE_SELL_LIMIT)
      success = Trade.SellLimit(lots, price, symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, comment);
   else if(orderType == ORDER_TYPE_BUY_STOP)
      success = Trade.BuyStop(lots, price, symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, comment);
   else
      success = Trade.SellStop(lots, price, symbol, slPrice, tpPrice, ORDER_TIME_GTC, 0, comment);

   if(success)
   {
      MqlTradeResult result;
      Trade.Result(result);

      if(result.retcode == TRADE_RETCODE_DONE || result.retcode == TRADE_RETCODE_PLACED)
      {
         Log("Pending order placed: Order=" + IntegerToString(result.order));
         return result.order;
      }
      else
      {
         errorCode = result.retcode;
         errorMsg = Trade.ResultRetcodeDescription();
         Log("Pending order failed: " + errorMsg);
         return 0;
      }
   }
   else
   {
      errorCode = Trade.ResultRetcode();
      errorMsg = Trade.ResultRetcodeDescription();
      Log("Pending order failed: " + errorMsg);
      return 0;
   }
}

//+------------------------------------------------------------------+
//| Close positions for symbol                                         |
//+------------------------------------------------------------------+
ulong ClosePositions(string symbol, string comment, double &executedPrice, uint &errorCode, string &errorMsg)
{
   int closed = 0;

   //--- Close market positions
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i))
         continue;

      if(PositionInfo.Symbol() != symbol)
         continue;

      if(PositionInfo.Magic() != MagicNumber)
         continue;

      ulong ticket = PositionInfo.Ticket();

      if(Trade.PositionClose(ticket))
      {
         closed++;
         executedPrice = Trade.ResultPrice();
      }
   }

   //--- Delete pending orders
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderInfo.SelectByIndex(i))
         continue;

      if(OrderInfo.Symbol() != symbol)
         continue;

      if(OrderInfo.Magic() != MagicNumber)
         continue;

      ulong ticket = OrderInfo.Ticket();

      if(Trade.OrderDelete(ticket))
         closed++;
   }

   if(closed > 0)
   {
      Log("Closed " + IntegerToString(closed) + " positions/orders for " + symbol);
      return (ulong)closed;
   }
   else
   {
      errorCode = TRADE_RETCODE_POSITION_CLOSED;
      errorMsg = "No positions found to close";
      return 0;
   }
}

//+------------------------------------------------------------------+
//| Close partial position                                             |
//+------------------------------------------------------------------+
ulong ClosePartialPosition(string symbol, double lots, string comment,
                           double &executedPrice, uint &errorCode, string &errorMsg)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i))
         continue;

      if(PositionInfo.Symbol() != symbol)
         continue;

      if(PositionInfo.Magic() != MagicNumber)
         continue;

      ulong ticket = PositionInfo.Ticket();
      double closeLots = MathMin(lots, PositionInfo.Volume());

      if(Trade.PositionClosePartial(ticket, closeLots))
      {
         executedPrice = Trade.ResultPrice();
         int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
         Log("Partial close: " + DoubleToString(closeLots, 2) + " lots at " + DoubleToString(executedPrice, digits));
         return ticket;
      }
   }

   errorCode = TRADE_RETCODE_POSITION_CLOSED;
   errorMsg = "No position found to partially close";
   return 0;
}

//+------------------------------------------------------------------+
//| Modify position TP/SL                                              |
//+------------------------------------------------------------------+
ulong ModifyPosition(string symbol, double tp, double sl, uint &errorCode, string &errorMsg)
{
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i))
         continue;

      if(PositionInfo.Symbol() != symbol)
         continue;

      if(PositionInfo.Magic() != MagicNumber)
         continue;

      ulong ticket = PositionInfo.Ticket();

      double newTp = (tp > 0) ? NormalizeDouble(tp, digits) : PositionInfo.TakeProfit();
      double newSl = (sl > 0) ? NormalizeDouble(sl, digits) : PositionInfo.StopLoss();

      if(Trade.PositionModify(ticket, newSl, newTp))
      {
         Log("Position modified: TP=" + DoubleToString(newTp, digits) + " SL=" + DoubleToString(newSl, digits));
         return ticket;
      }
      else
      {
         errorCode = Trade.ResultRetcode();
         errorMsg = Trade.ResultRetcodeDescription();
         return 0;
      }
   }

   errorCode = TRADE_RETCODE_POSITION_CLOSED;
   errorMsg = "No position found to modify";
   return 0;
}

//+------------------------------------------------------------------+
//| Report execution result to server                                  |
//+------------------------------------------------------------------+
void ReportResult(string signalId, bool success, ulong ticket, double price,
                  double quantity, int executionTimeMs, uint errorCode, string errorMsg)
{
   string url = gResultEndpoint + signalId + "/result?api_key=" + ApiKey;

   //--- Build JSON payload
   string json = "{";
   json += "\"success\":" + (success ? "true" : "false");

   if(ticket > 0)
      json += ",\"ticket\":" + IntegerToString(ticket);

   if(price > 0)
      json += ",\"executed_price\":" + DoubleToString(price, 8);

   if(quantity > 0)
      json += ",\"executed_quantity\":" + DoubleToString(quantity, 4);

   json += ",\"execution_time_ms\":" + IntegerToString(executionTimeMs);
   json += ",\"error_code\":" + IntegerToString(errorCode);

   if(StringLen(errorMsg) > 0)
      json += ",\"error_message\":\"" + EscapeJsonString(errorMsg) + "\"";

   json += "}";

   //--- Send result
   string response = "";
   int result = HttpPost(url, json, response);

   if(result == 200)
   {
      Log("Result reported successfully for signal: " + signalId);
   }
   else
   {
      Log("Failed to report result for signal: " + signalId + " HTTP: " + IntegerToString(result));
   }
}

//+------------------------------------------------------------------+
//| HTTP GET request                                                   |
//+------------------------------------------------------------------+
int HttpGet(string url, string &response)
{
   char post[];
   char result[];
   string headers = "Content-Type: application/json\r\n";
   string resultHeaders;

   ResetLastError();
   int res = WebRequest("GET", url, headers, 5000, post, result, resultHeaders);

   if(res == -1)
   {
      int error = GetLastError();
      Log("WebRequest GET failed. Error: " + IntegerToString(error));

      if(error == 4060)
         Log("Add URL to allowed list: Tools -> Options -> Expert Advisors");

      return -1;
   }

   response = CharArrayToString(result);
   return res;
}

//+------------------------------------------------------------------+
//| HTTP POST request                                                  |
//+------------------------------------------------------------------+
int HttpPost(string url, string jsonBody, string &response)
{
   char post[];
   char result[];
   string headers = "Content-Type: application/json\r\n";
   string resultHeaders;

   StringToCharArray(jsonBody, post, 0, StringLen(jsonBody));

   ResetLastError();
   int res = WebRequest("POST", url, headers, 5000, post, result, resultHeaders);

   if(res == -1)
   {
      int error = GetLastError();
      Log("WebRequest POST failed. Error: " + IntegerToString(error));
      return -1;
   }

   response = CharArrayToString(result);
   return res;
}

//+------------------------------------------------------------------+
//| Test server connection                                             |
//+------------------------------------------------------------------+
bool TestConnection()
{
   string response = "";

   // Try the pending signals endpoint with API key
   int result = HttpGet(gPendingEndpoint, response);

   if(result == 200 || result == 401) // 401 means server is reachable but auth failed
   {
      if(result == 401)
         Log("Warning: API key may be invalid");
      return (result == 200);
   }

   return false;
}

//+------------------------------------------------------------------+
//| Map TradingView symbol to MT5 symbol                               |
//+------------------------------------------------------------------+
string MapSymbol(string tvSymbol)
{
   // Common mappings - customize based on your broker
   if(tvSymbol == "XAUUSD" || tvSymbol == "GOLD")
      return "XAUUSD";  // Adjust to your broker's gold symbol

   if(tvSymbol == "XTIUSD" || tvSymbol == "USOIL" || tvSymbol == "OIL")
      return "XTIUSD";  // Adjust to your broker's oil symbol

   // Return as-is if no mapping found
   return tvSymbol;
}

//+------------------------------------------------------------------+
//| Extract value from JSON string                                     |
//+------------------------------------------------------------------+
string ExtractJsonValue(string json, string key)
{
   string searchKey = "\"" + key + "\":";
   int keyPos = StringFind(json, searchKey);

   if(keyPos == -1)
      return "";

   int valueStart = keyPos + StringLen(searchKey);

   // Skip whitespace
   while(valueStart < StringLen(json) && (StringGetCharacter(json, valueStart) == ' ' ||
         StringGetCharacter(json, valueStart) == '\t'))
      valueStart++;

   if(valueStart >= StringLen(json))
      return "";

   ushort firstChar = StringGetCharacter(json, valueStart);

   // String value
   if(firstChar == '"')
   {
      int valueEnd = StringFind(json, "\"", valueStart + 1);
      if(valueEnd == -1)
         return "";
      return StringSubstr(json, valueStart + 1, valueEnd - valueStart - 1);
   }

   // Null value
   if(StringSubstr(json, valueStart, 4) == "null")
      return "";

   // Number, boolean, or object/array
   int valueEnd = valueStart;
   int braceCount = 0;
   int bracketCount = 0;

   while(valueEnd < StringLen(json))
   {
      ushort c = StringGetCharacter(json, valueEnd);

      if(c == '{') braceCount++;
      else if(c == '}') braceCount--;
      else if(c == '[') bracketCount++;
      else if(c == ']') bracketCount--;

      if(braceCount == 0 && bracketCount == 0 && (c == ',' || c == '}' || c == ']'))
         break;

      valueEnd++;
   }

   return StringSubstr(json, valueStart, valueEnd - valueStart);
}

//+------------------------------------------------------------------+
//| Parse JSON array into string array                                 |
//+------------------------------------------------------------------+
int ParseJsonArray(string json, string &items[])
{
   ArrayResize(items, 0);

   // Remove outer brackets
   if(StringGetCharacter(json, 0) == '[')
      json = StringSubstr(json, 1, StringLen(json) - 2);

   if(StringLen(json) == 0)
      return 0;

   int count = 0;
   int pos = 0;
   int braceCount = 0;
   int start = 0;

   while(pos < StringLen(json))
   {
      ushort c = StringGetCharacter(json, pos);

      if(c == '{')
      {
         if(braceCount == 0)
            start = pos;
         braceCount++;
      }
      else if(c == '}')
      {
         braceCount--;
         if(braceCount == 0)
         {
            ArrayResize(items, count + 1);
            items[count] = StringSubstr(json, start, pos - start + 1);
            count++;
         }
      }

      pos++;
   }

   return count;
}

//+------------------------------------------------------------------+
//| Escape string for JSON                                             |
//+------------------------------------------------------------------+
string EscapeJsonString(string str)
{
   StringReplace(str, "\\", "\\\\");
   StringReplace(str, "\"", "\\\"");
   StringReplace(str, "\n", "\\n");
   StringReplace(str, "\r", "\\r");
   StringReplace(str, "\t", "\\t");
   return str;
}

//+------------------------------------------------------------------+
//| Log message                                                        |
//+------------------------------------------------------------------+
void Log(string message)
{
   if(EnableLogging)
      Print("[SignalBridge] " + message);
}

//+------------------------------------------------------------------+
//| Calculate lots based on risk %                                     |
//+------------------------------------------------------------------+
double CalculateRiskLots(string symbol, double riskPercent, double slDistance)
{
   if(slDistance <= 0) return 0;

   double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount = accountBalance * (riskPercent / 100.0);
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   
   if(tickSize == 0 || tickValue == 0) return 0;
   
   double lots = riskAmount / ((slDistance / tickSize) * tickValue);
   return lots;
}

//+------------------------------------------------------------------+
//| Check trade filters                                                |
//+------------------------------------------------------------------+
bool CheckFilters(string symbol)
{
   // 1. Time Filter
   if(UseTimeFilter)
   {
      datetime currentTime = TimeCurrent();
      MqlDateTime tm;
      TimeToStruct(currentTime, tm);
      int currentHour = tm.hour;
      
      if(currentHour < StartHour || currentHour >= EndHour)
      {
         Log("Filter: Time " + IntegerToString(currentHour) + "h outside allowed hours (" + IntegerToString(StartHour) + "-" + IntegerToString(EndHour) + ")");
         return false;
      }
   }

   // 2. Spread Filter
   long spread = SymbolInfoInteger(symbol, SYMBOL_SPREAD); // Returns in points
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   
   // Adjust for 5-digit brokers (points vs pips)
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double pipSize = (digits == 3 || digits == 5) ? 10 * point : point;
   
   double spreadPips = (double)spread * point / pipSize;
   
   if(spreadPips > MaxSpreadPips)
   {
      Log("Filter: Spread " + DoubleToString(spreadPips, 1) + " > Max " + DoubleToString(MaxSpreadPips, 1));
      return false;
   }

   // 3. Max Daily Drawdown
   if(UseDailyDrawdown)
   {
      double dailyProfit = GetDailyProfit();
      double startBalance = AccountInfoDouble(ACCOUNT_BALANCE) - dailyProfit; 
      double maxLoss = startBalance * (MaxDailyLossPercent / 100.0);
      
      if(dailyProfit < -maxLoss)
      {
         Log("Filter: Max daily drawdown reached (" + DoubleToString(dailyProfit, 2) + " < -" + DoubleToString(maxLoss, 2) + ")");
         return false;
      }
   }

   return true;
}

//+------------------------------------------------------------------+
//| Get daily profit                                                   |
//+------------------------------------------------------------------+
double GetDailyProfit()
{
   double profit = 0;
   datetime currentTime = TimeCurrent();
   datetime startOfDay = currentTime - (currentTime % 86400); // Start of current day server time (00:00:00)
   
   if(HistorySelect(startOfDay, currentTime))
   {
      int deals = HistoryDealsTotal();
      for(int i = 0; i < deals; i++)
      {
         ulong ticket = HistoryDealGetTicket(i);
         if(ticket > 0)
         {
            long magic = 0;
            if(HistoryDealGetInteger(ticket, DEAL_MAGIC, magic))
            {
               if(magic == MagicNumber)
               {
                  profit += HistoryDealGetDouble(ticket, DEAL_PROFIT) + 
                            HistoryDealGetDouble(ticket, DEAL_COMMISSION) + 
                            HistoryDealGetDouble(ticket, DEAL_SWAP);
               }
            }
         }
      }
   }
   
   return profit;
}

//+------------------------------------------------------------------+
//| Manage Trailing Stop                                               |
//+------------------------------------------------------------------+
void ManageTrailingStop()
{
   if(TrailingStopPips <= 0) return;

   int total = PositionsTotal();
   for(int i = total - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Magic() != MagicNumber) continue;

      string symbol = PositionInfo.Symbol();
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      
      // Calculate Pip size
      double pipSize = (digits == 3 || digits == 5) ? 10 * point : point;
      
      double trailingStopDist = TrailingStopPips * pipSize;
      double trailingStepDist = TrailingStepPips * pipSize;
      
      if(PositionInfo.PositionType() == POSITION_TYPE_BUY)
      {
         double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
         double newSL = NormalizeDouble(bid - trailingStopDist, digits);
         
         if(newSL > PositionInfo.StopLoss() + trailingStepDist && newSL > PositionInfo.PriceOpen())
         {
             if(newSL > PositionInfo.StopLoss())
             {
                if(Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit()))
                   Log("Trailing Stop updated for Ticket " + IntegerToString(PositionInfo.Ticket()));
             }
         }
      }
      else if(PositionInfo.PositionType() == POSITION_TYPE_SELL)
      {
         double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
         double newSL = NormalizeDouble(ask + trailingStopDist, digits);
         
         if((PositionInfo.StopLoss() == 0 || newSL < PositionInfo.StopLoss() - trailingStepDist) && newSL < PositionInfo.PriceOpen())
         {
             if(PositionInfo.StopLoss() == 0 || newSL < PositionInfo.StopLoss())
             {
                if(Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit()))
                   Log("Trailing Stop updated for Ticket " + IntegerToString(PositionInfo.Ticket()));
             }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Manage Break-Even Stops                                            |
//+------------------------------------------------------------------+
void ManageBreakEven()
{
   if(!UseBreakEven) return;

   int total = PositionsTotal();
   for(int i = total - 1; i >= 0; i--)
   {
      if(!PositionInfo.SelectByIndex(i)) continue;
      if(PositionInfo.Magic() != MagicNumber) continue;

      string symbol = PositionInfo.Symbol();
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      double pipSize = (digits == 3 || digits == 5) ? 10 * point : point;
      
      double breakEvenDist = BreakEvenPips * pipSize;
      double lockDist = BreakEvenLockPips * pipSize;

      if(PositionInfo.PositionType() == POSITION_TYPE_BUY)
      {
         double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
         double profit = bid - PositionInfo.PriceOpen();
         if(profit >= breakEvenDist && PositionInfo.StopLoss() < PositionInfo.PriceOpen())
         {
            double newSL = NormalizeDouble(PositionInfo.PriceOpen() + lockDist, digits);
            if(Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit()))
               Log("Break-Even set for Buy Ticket " + IntegerToString(PositionInfo.Ticket()));
         }
      }
      else if(PositionInfo.PositionType() == POSITION_TYPE_SELL)
      {
         double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
         double profit = PositionInfo.PriceOpen() - ask;
         if(profit >= breakEvenDist && (PositionInfo.StopLoss() > PositionInfo.PriceOpen() || PositionInfo.StopLoss() == 0))
         {
            double newSL = NormalizeDouble(PositionInfo.PriceOpen() - lockDist, digits);
            if(Trade.PositionModify(PositionInfo.Ticket(), newSL, PositionInfo.TakeProfit()))
               Log("Break-Even set for Sell Ticket " + IntegerToString(PositionInfo.Ticket()));
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Check and close positions before weekend                           |
//+------------------------------------------------------------------+
void CheckWeekendClose()
{
   if(!CloseBeforeWeekend) return;
   
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   
   if(dt.day_of_week == 5 && dt.hour >= FridayCloseHour)
   {
      int closedCount = 0;
      int total = PositionsTotal();
      for(int i = total - 1; i >= 0; i--)
      {
         if(!PositionInfo.SelectByIndex(i)) continue;
         if(PositionInfo.Magic() != MagicNumber) continue;
         
         if(Trade.PositionClose(PositionInfo.Ticket()))
         {
            Log("Weekend Close: Closed Ticket " + IntegerToString(PositionInfo.Ticket()));
            closedCount++;
         }
      }
      if(closedCount > 0)
         Log("Weekend Close: Total " + IntegerToString(closedCount) + " positions closed");
   }
}

//+------------------------------------------------------------------+
//| Expert tick function (not used, using timer instead)               |
//+------------------------------------------------------------------+
void OnTick()
{
   // Not used - using OnTimer for polling
}
//+------------------------------------------------------------------+
