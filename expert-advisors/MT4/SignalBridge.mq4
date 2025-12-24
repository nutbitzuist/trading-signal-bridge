//+------------------------------------------------------------------+
//|                                               SignalBridge.mq4   |
//|                                    Trading Signal Bridge Client  |
//|                                  https://signals.myalgostack.com  |
//+------------------------------------------------------------------+
#property copyright "Trading Signal Bridge"
#property link      "https://signals.myalgostack.com"
#property version   "2.00"
#property strict

//--- Input Parameters
input string   ServerURL          = "https://signals.myalgostack.com/api/v1";  // Server URL (pre-configured)
input string   ApiKey             = "";                                  // API Key (from dashboard)
input int      PollIntervalSec    = 2;                                   // Poll interval (seconds)
input double   MaxLotSize         = 1.0;                                 // Maximum lot size
input double   DefaultLotSize     = 0.1;                                 // Default lot size
input int      Slippage           = 3;                                   // Slippage (points)
input int      MagicNumber        = 123456;                              // Magic number
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
input double   MaxSpreadPips      = 50.0;                                // Maximum allowed spread in pips (increase for gold/indices)
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

   //--- Test connection
   if(!TestConnection())
   {
      Alert("SignalBridge: Failed to connect to server. Check URL and API key.");
      return(INIT_FAILED);
   }

   //--- Initialize starting equity for equity protection
   gStartingEquity = AccountEquity();

   //--- Start timer
   EventSetTimer(PollIntervalSec);

   Log("SignalBridge initialized successfully");
   Log("Server: " + ServerURL);
   Log("Poll interval: " + IntegerToString(PollIntervalSec) + " seconds");
   if(UseBreakEven) Log("Break-Even: ON (" + IntegerToString(BreakEvenPips) + " pips)");
   if(TrailingStopPips > 0) Log("Trailing Stop: ON (" + IntegerToString(TrailingStopPips) + " pips)");
   if(MaxOpenTrades > 0) Log("Max Open Trades: " + IntegerToString(MaxOpenTrades));
   if(CloseBeforeWeekend) Log("Weekend Close: ON (Friday " + IntegerToString(FridayCloseHour) + ":00)");

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
   if(!IsTradeAllowed())
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
   //--- Debug: Log raw response length
   Log("Received response length: " + IntegerToString(StringLen(response)));
   
   //--- Extract signals array
   string signalsJson = ExtractJsonValue(response, "signals");
   
   //--- Debug: Log extracted signals
   Log("Extracted signals JSON length: " + IntegerToString(StringLen(signalsJson)));
   
   // Log first 100 chars of signals JSON for debugging
   string preview = StringSubstr(signalsJson, 0, MathMin(100, StringLen(signalsJson)));
   Log("Signals JSON preview: " + preview);

   if(StringLen(signalsJson) <= 2) // Empty array "[]"
   {
      Log("No pending signals");
      return;
   }

   //--- Parse each signal
   string signals[];
   int count = ParseJsonArray(signalsJson, signals);
   
   Log("Parsed " + IntegerToString(count) + " signals from response");

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
      ReportResult(signalId, false, 0, 0, 0, 0, 4106, "Symbol not found: " + mtSymbol);
      return;
   }

   //--- Check filters
   if(!CheckFilters(mtSymbol))
   {
      ReportResult(signalId, false, 0, 0, 0, 0, 133, "Trade blocked by filters");
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
         
      // If signal didn't have SL, try to find a default distance logic or fail
      // For now, only calculate if SL is explicit in signal. 
      // User can also implement default SL distance logic here if needed.
       
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
   double minLot = MarketInfo(mtSymbol, MODE_MINLOT);
   double maxLot = MarketInfo(mtSymbol, MODE_MAXLOT);
   double lotStep = MarketInfo(mtSymbol, MODE_LOTSTEP);

   lots = MathMax(minLot, MathMin(maxLot, NormalizeDouble(lots / lotStep, 0) * lotStep));

   //--- Execute based on action
   int ticket = 0;
   double executedPrice = 0;
   int errorCode = 0;
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
      errorCode = -1;
      errorMsg = "Unknown action: " + action;
   }

   int executionTimeMs = (int)((TimeLocal() - startTime) * 1000);

   //--- Report result
   ReportResult(signalId, ticket > 0, ticket, executedPrice, lots, executionTimeMs, errorCode, errorMsg);
}

//+------------------------------------------------------------------+
//| Execute market order (buy/sell)                                    |
//+------------------------------------------------------------------+
int ExecuteMarketOrder(string symbol, string action, double lots, double tp, double sl,
                       string comment, double &executedPrice, int &errorCode, string &errorMsg)
{
   int cmd = (action == "buy") ? OP_BUY : OP_SELL;
   double price = (cmd == OP_BUY) ? MarketInfo(symbol, MODE_ASK) : MarketInfo(symbol, MODE_BID);

   //--- Calculate TP/SL prices
   double point = MarketInfo(symbol, MODE_POINT);
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);

   double tpPrice = 0;
   double slPrice = 0;

   if(EnableTakeProfit && tp > 0)
      tpPrice = NormalizeDouble(tp, digits);

   if(EnableStopLoss && sl > 0)
      slPrice = NormalizeDouble(sl, digits);

   //--- Execute order
   int ticket = OrderSend(symbol, cmd, lots, price, Slippage, slPrice, tpPrice,
                          comment, MagicNumber, 0, (cmd == OP_BUY) ? clrGreen : clrRed);

   if(ticket > 0)
   {
      if(OrderSelect(ticket, SELECT_BY_TICKET))
         executedPrice = OrderOpenPrice();
      Log("Order executed: Ticket=" + IntegerToString(ticket) + " Price=" + DoubleToString(executedPrice, digits));
   }
   else
   {
      errorCode = GetLastError();
      errorMsg = ErrorDescription(errorCode);
      Log("Order failed: " + errorMsg);
   }

   return ticket;
}

//+------------------------------------------------------------------+
//| Execute pending order                                              |
//+------------------------------------------------------------------+
int ExecutePendingOrder(string symbol, string action, double lots, double price,
                        double tp, double sl, string comment, int &errorCode, string &errorMsg)
{
   int cmd;

   if(action == "buy_limit") cmd = OP_BUYLIMIT;
   else if(action == "sell_limit") cmd = OP_SELLLIMIT;
   else if(action == "buy_stop") cmd = OP_BUYSTOP;
   else if(action == "sell_stop") cmd = OP_SELLSTOP;
   else
   {
      errorCode = -1;
      errorMsg = "Invalid pending order type";
      return 0;
   }

   int digits = (int)MarketInfo(symbol, MODE_DIGITS);
   price = NormalizeDouble(price, digits);

   double tpPrice = 0;
   double slPrice = 0;

   if(EnableTakeProfit && tp > 0)
      tpPrice = NormalizeDouble(tp, digits);

   if(EnableStopLoss && sl > 0)
      slPrice = NormalizeDouble(sl, digits);

   int ticket = OrderSend(symbol, cmd, lots, price, Slippage, slPrice, tpPrice,
                          comment, MagicNumber, 0, clrYellow);

   if(ticket <= 0)
   {
      errorCode = GetLastError();
      errorMsg = ErrorDescription(errorCode);
      Log("Pending order failed: " + errorMsg);
   }
   else
   {
      Log("Pending order placed: Ticket=" + IntegerToString(ticket));
   }

   return ticket;
}

//+------------------------------------------------------------------+
//| Close positions for symbol                                         |
//+------------------------------------------------------------------+
int ClosePositions(string symbol, string comment, double &executedPrice, int &errorCode, string &errorMsg)
{
   int closed = 0;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         continue;

      if(OrderSymbol() != symbol)
         continue;

      if(OrderMagicNumber() != MagicNumber)
         continue;

      if(OrderType() > OP_SELL) // Pending order
      {
         if(OrderDelete(OrderTicket()))
            closed++;
      }
      else // Market order
      {
         double closePrice = (OrderType() == OP_BUY) ?
                            MarketInfo(symbol, MODE_BID) : MarketInfo(symbol, MODE_ASK);

         if(OrderClose(OrderTicket(), OrderLots(), closePrice, Slippage, clrWhite))
         {
            closed++;
            executedPrice = closePrice;
         }
      }
   }

   if(closed > 0)
   {
      Log("Closed " + IntegerToString(closed) + " positions for " + symbol);
      return closed;
   }
   else
   {
      errorCode = -2;
      errorMsg = "No positions found to close";
      return 0;
   }
}

//+------------------------------------------------------------------+
//| Close partial position                                             |
//+------------------------------------------------------------------+
int ClosePartialPosition(string symbol, double lots, string comment,
                         double &executedPrice, int &errorCode, string &errorMsg)
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         continue;

      if(OrderSymbol() != symbol)
         continue;

      if(OrderMagicNumber() != MagicNumber)
         continue;

      if(OrderType() > OP_SELL) // Skip pending orders
         continue;

      double closeLots = MathMin(lots, OrderLots());
      double closePrice = (OrderType() == OP_BUY) ?
                         MarketInfo(symbol, MODE_BID) : MarketInfo(symbol, MODE_ASK);

      if(OrderClose(OrderTicket(), closeLots, closePrice, Slippage, clrWhite))
      {
         executedPrice = closePrice;
         Log("Partial close: " + DoubleToString(closeLots, 2) + " lots at " + DoubleToString(closePrice, (int)MarketInfo(symbol, MODE_DIGITS)));
         return OrderTicket();
      }
   }

   errorCode = -2;
   errorMsg = "No position found to partially close";
   return 0;
}

//+------------------------------------------------------------------+
//| Modify position TP/SL                                              |
//+------------------------------------------------------------------+
int ModifyPosition(string symbol, double tp, double sl, int &errorCode, string &errorMsg)
{
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);

   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         continue;

      if(OrderSymbol() != symbol)
         continue;

      if(OrderMagicNumber() != MagicNumber)
         continue;

      if(OrderType() > OP_SELL) // Skip pending orders
         continue;

      double newTp = (tp > 0) ? NormalizeDouble(tp, digits) : OrderTakeProfit();
      double newSl = (sl > 0) ? NormalizeDouble(sl, digits) : OrderStopLoss();

      if(OrderModify(OrderTicket(), OrderOpenPrice(), newSl, newTp, 0, clrBlue))
      {
         Log("Position modified: TP=" + DoubleToString(newTp, digits) + " SL=" + DoubleToString(newSl, digits));
         return OrderTicket();
      }
      else
      {
         errorCode = GetLastError();
         errorMsg = ErrorDescription(errorCode);
         return 0;
      }
   }

   errorCode = -2;
   errorMsg = "No position found to modify";
   return 0;
}

//+------------------------------------------------------------------+
//| Report execution result to server                                  |
//+------------------------------------------------------------------+
void ReportResult(string signalId, bool success, int ticket, double price,
                  double quantity, int executionTimeMs, int errorCode, string errorMsg)
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

   ResetLastError();
   int res = WebRequest("GET", url, headers, 5000, post, result, headers);

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

   StringToCharArray(jsonBody, post, 0, StringLen(jsonBody));

   ResetLastError();
   int res = WebRequest("POST", url, headers, 5000, post, result, headers);

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
   string healthUrl = ServerURL + "/../health";  // Adjust based on your API structure

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
//| Map TradingView symbol to MT4 symbol                               |
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
   bool isArray = (firstChar == '[');
   bool isObject = (firstChar == '{');

   while(valueEnd < StringLen(json))
   {
      ushort c = StringGetCharacter(json, valueEnd);

      if(c == '{') braceCount++;
      else if(c == '}') braceCount--;
      else if(c == '[') bracketCount++;
      else if(c == ']') bracketCount--;

      // For arrays and objects, include the closing bracket/brace
      if(isArray && bracketCount == 0 && c == ']')
      {
         valueEnd++;
         break;
      }
      if(isObject && braceCount == 0 && c == '}')
      {
         valueEnd++;
         break;
      }
      
      // For simple values (numbers, booleans), stop at delimiter
      if(!isArray && !isObject && braceCount == 0 && bracketCount == 0 && (c == ',' || c == '}' || c == ']'))
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
//| Get error description                                              |
//+------------------------------------------------------------------+
string ErrorDescription(int errorCode)
{
   switch(errorCode)
   {
      case 0:    return "No error";
      case 1:    return "No error, trade conditions not changed";
      case 2:    return "Common error";
      case 3:    return "Invalid trade parameters";
      case 4:    return "Trade server is busy";
      case 5:    return "Old version of the client terminal";
      case 6:    return "No connection with trade server";
      case 7:    return "Not enough rights";
      case 8:    return "Too frequent requests";
      case 9:    return "Malfunctional trade operation";
      case 64:   return "Account disabled";
      case 65:   return "Invalid account";
      case 128:  return "Trade timeout";
      case 129:  return "Invalid price";
      case 130:  return "Invalid stops";
      case 131:  return "Invalid trade volume";
      case 132:  return "Market is closed";
      case 133:  return "Trade is disabled";
      case 134:  return "Not enough money";
      case 135:  return "Price changed";
      case 136:  return "Off quotes";
      case 137:  return "Broker is busy";
      case 138:  return "Requote";
      case 139:  return "Order is locked";
      case 140:  return "Buy orders only allowed";
      case 141:  return "Too many requests";
      case 145:  return "Modification denied because order is too close to market";
      case 146:  return "Trade context is busy";
      case 147:  return "Expirations are denied by broker";
      case 148:  return "Amount of open and pending orders has reached the limit";
      case 149:  return "Hedging is prohibited";
      case 150:  return "Prohibited by FIFO rules";
      case 4060: return "URL not in allowed list";
      case 4106: return "Unknown symbol";
      default:   return "Unknown error: " + IntegerToString(errorCode);
   }
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

   double accountBalance = AccountBalance();
   double riskAmount = accountBalance * (riskPercent / 100.0);
   double tickValue = MarketInfo(symbol, MODE_TICKVALUE);
   double tickSize = MarketInfo(symbol, MODE_TICKSIZE);
   double point = MarketInfo(symbol, MODE_POINT);

   // Adjust tick value for 5/3 digit brokers if needed, but MODE_TICKVALUE usually handles it.
   // Important: MODE_TICKVALUE is per lot per tick. 
   
   // Formula: Risk = Lots * (SL_Distance / TickSize) * TickValue
   // Lots = Risk / ((SL_Distance / TickSize) * TickValue)
   
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
      int currentHour = Hour();
      if(currentHour < StartHour || currentHour >= EndHour)
      {
         Log("Filter: Time " + IntegerToString(currentHour) + "h outside allowed hours (" + IntegerToString(StartHour) + "-" + IntegerToString(EndHour) + ")");
         return false;
      }
   }

   // 2. Weekend Close Filter
   if(CloseBeforeWeekend)
   {
      if(DayOfWeek() == 5 && Hour() >= FridayCloseHour)
      {
         Log("Filter: Friday close time reached. Blocking new trades.");
         return false;
      }
   }

   // 3. Max Open Trades Filter
   if(MaxOpenTrades > 0)
   {
      int openCount = 0;
      for(int i = 0; i < OrdersTotal(); i++)
      {
         if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         {
            if(OrderMagicNumber() == MagicNumber && OrderType() <= OP_SELL)
               openCount++;
         }
      }
      if(openCount >= MaxOpenTrades)
      {
         Log("Filter: Max open trades limit reached (" + IntegerToString(openCount) + "/" + IntegerToString(MaxOpenTrades) + ")");
         return false;
      }
   }

   // 4. Min Equity Filter
   if(MinEquityPercent > 0)
   {
      if(gStartingEquity > 0)
      {
         double currentEquity = AccountEquity();
         double equityPercent = (currentEquity / gStartingEquity) * 100;
         if(equityPercent < MinEquityPercent)
         {
            Log("Filter: Equity below minimum (" + DoubleToString(equityPercent, 1) + "% < " + DoubleToString(MinEquityPercent, 1) + "%)");
            return false;
         }
      }
   }

   // 5. Symbol Whitelist Filter
   if(StringLen(SymbolWhitelist) > 0)
   {
      string whitelistLower = SymbolWhitelist;
      StringToLower(whitelistLower);
      string symbolLower = symbol;
      StringToLower(symbolLower);
      
      if(StringFind(whitelistLower, symbolLower) < 0)
      {
         Log("Filter: Symbol " + symbol + " not in whitelist");
         return false;
      }
   }

   // 6. Spread Filter
   double spread = MarketInfo(symbol, MODE_SPREAD);
   double point = MarketInfo(symbol, MODE_POINT);
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);
   double pipSize = (digits == 3 || digits == 5) ? 10 * point : point;
   double currentSpreadPips = spread * point / pipSize;
   
   if(currentSpreadPips > MaxSpreadPips)
   {
      Log("Filter: Spread " + DoubleToString(currentSpreadPips, 1) + " > Max " + DoubleToString(MaxSpreadPips, 1));
      return false;
   }

   // 7. Max Daily Drawdown
   if(UseDailyDrawdown)
   {
      double dailyProfit = GetDailyProfit();
      double startBalance = AccountBalance() - dailyProfit;
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
   datetime startOfDay = iTime(NULL, PERIOD_D1, 0); // Start of current day server time

   for(int i = 0; i < OrdersHistoryTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
      {
         if(OrderMagicNumber() == MagicNumber && OrderCloseTime() >= startOfDay)
         {
            profit += OrderProfit() + OrderCommission() + OrderSwap();
         }
      }
   }
   
   // Add floating profit of open positions too? Usually drawdown limits include closed loss.
   // Let's stick to closed P/L for now as a "Stop Trading" trigger. 
   // Users often want "Daily Loss Limit" on closed trades.
   
   return profit;
}

//+------------------------------------------------------------------+
//| Manage Trailing Stop                                               |
//+------------------------------------------------------------------+
void ManageTrailingStop()
{
   if(TrailingStopPips <= 0) return;

   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderMagicNumber() != MagicNumber) continue;
      if(OrderType() > OP_SELL) continue; // Skip pending

      string symbol = OrderSymbol();
      double point = MarketInfo(symbol, MODE_POINT);
      int digits = (int)MarketInfo(symbol, MODE_DIGITS);
      
      // Calculate Pip size
      double pipSize = (digits == 3 || digits == 5) ? 10 * point : point;
      
      double trailingStopDist = TrailingStopPips * pipSize;
      double trailingStepDist = TrailingStepPips * pipSize;
      
      if(OrderType() == OP_BUY)
      {
         double newSL = NormalizeDouble(Bid - trailingStopDist, digits);
         if(newSL > OrderStopLoss() + trailingStepDist && newSL > OrderOpenPrice()) // Only trail profit? Or trail everything? Usually trail profit.
         {
             // Basic trailing: Move SL up if price moves up.
             // Check if price > OpenPrice + Trailing (to ensure we are in profit start trailing? not specified, assume standard trailing)
             // Standard: If (Bid - OpenPrice) > TrailingStop, then set SL. 
             // Let's implement simpler logic: Always maintain distance if price moves favorably.
             
             if(newSL > OrderStopLoss())
             {
                if(OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0, clrBlue))
                   Log("Trailing Stop updated for Ticket " + IntegerToString(OrderTicket()));
             }
         }
      }
      else if(OrderType() == OP_SELL)
      {
         double newSL = NormalizeDouble(Ask + trailingStopDist, digits);
         if((OrderStopLoss() == 0 || newSL < OrderStopLoss() - trailingStepDist) && newSL < OrderOpenPrice())
         {
             if(OrderStopLoss() == 0 || newSL < OrderStopLoss())
             {
                if(OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0, clrBlue))
                   Log("Trailing Stop updated for Ticket " + IntegerToString(OrderTicket()));
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

   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderMagicNumber() != MagicNumber) continue;
      if(OrderType() > OP_SELL) continue;

      string symbol = OrderSymbol();
      double point = MarketInfo(symbol, MODE_POINT);
      int digits = (int)MarketInfo(symbol, MODE_DIGITS);
      double pipSize = (digits == 3 || digits == 5) ? 10 * point : point;
      
      double breakEvenDist = BreakEvenPips * pipSize;
      double lockDist = BreakEvenLockPips * pipSize;

      if(OrderType() == OP_BUY)
      {
         double profit = Bid - OrderOpenPrice();
         if(profit >= breakEvenDist && OrderStopLoss() < OrderOpenPrice())
         {
            double newSL = NormalizeDouble(OrderOpenPrice() + lockDist, digits);
            if(OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0, clrGreen))
               Log("Break-Even set for Buy Ticket " + IntegerToString(OrderTicket()));
         }
      }
      else if(OrderType() == OP_SELL)
      {
         double profit = OrderOpenPrice() - Ask;
         if(profit >= breakEvenDist && (OrderStopLoss() > OrderOpenPrice() || OrderStopLoss() == 0))
         {
            double newSL = NormalizeDouble(OrderOpenPrice() - lockDist, digits);
            if(OrderModify(OrderTicket(), OrderOpenPrice(), newSL, OrderTakeProfit(), 0, clrGreen))
               Log("Break-Even set for Sell Ticket " + IntegerToString(OrderTicket()));
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
   
   if(DayOfWeek() == 5 && Hour() >= FridayCloseHour)
   {
      int closedCount = 0;
      for(int i = OrdersTotal() - 1; i >= 0; i--)
      {
         if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
         if(OrderMagicNumber() != MagicNumber) continue;
         if(OrderType() > OP_SELL) continue;
         
         bool result = false;
         if(OrderType() == OP_BUY)
            result = OrderClose(OrderTicket(), OrderLots(), Bid, Slippage, clrRed);
         else if(OrderType() == OP_SELL)
            result = OrderClose(OrderTicket(), OrderLots(), Ask, Slippage, clrRed);
         
         if(result)
         {
            Log("Weekend Close: Closed Ticket " + IntegerToString(OrderTicket()));
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
