//+------------------------------------------------------------------+
//|                                               SignalBridge.mq4   |
//|                                    Trading Signal Bridge Client  |
//|                                         https://your-server.com  |
//+------------------------------------------------------------------+
#property copyright "Trading Signal Bridge"
#property link      "https://your-server.com"
#property version   "1.00"
#property strict

//--- Input Parameters
input string   ServerURL          = "https://your-server.com/api/v1";  // Server URL
input string   ApiKey             = "";                                  // API Key (from dashboard)
input int      PollIntervalSec    = 2;                                   // Poll interval (seconds)
input double   MaxLotSize         = 1.0;                                 // Maximum lot size
input double   DefaultLotSize     = 0.1;                                 // Default lot size
input int      Slippage           = 3;                                   // Slippage (points)
input int      MagicNumber        = 123456;                              // Magic number
input bool     EnableTakeProfit   = true;                                // Enable take profit
input bool     EnableStopLoss     = true;                                // Enable stop loss
input bool     EnableLogging      = true;                                // Enable detailed logging

//--- Global Variables
string         gPendingEndpoint;
string         gResultEndpoint;
int            gLastError = 0;
datetime       gLastPollTime = 0;
int            gConnectionErrors = 0;
const int      MAX_CONNECTION_ERRORS = 10;

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
      ReportResult(signalId, false, 0, 0, 0, 0, 4106, "Symbol not found: " + mtSymbol);
      return;
   }

   //--- Determine lot size
   double lots = quantity;
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
//| Expert tick function (not used, using timer instead)               |
//+------------------------------------------------------------------+
void OnTick()
{
   // Not used - using OnTimer for polling
}
//+------------------------------------------------------------------+
