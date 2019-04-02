function DeleteOldEntries() {
  // Iterates over all rows of a sheet ACTIVESHEET in a google spreadsheet
  // Reads the date from 'dateColIdx' and deletes a row based on some expiry conditions

  // Adapted from https://stackoverflow.com/a/41115104
  // Modified by Akshay Rao | 02-Apr-2019
  //
  // Modifications:
  //  - Rows are read from the top, instead of the bottom
  //  - Added a rudimentary function to get the number of days between two dates
  //  - Some other custom conditions etc
  //    - This use case was that new rows are appended at the bottom
  //    - However, the rows are MOSTLY ordered by date with variation of a few minutes
  //  - Iterations stop when either 1) the last row has been reached
  //                                2) The date is a future date (2 days in the future)
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("ACTIVESHEET");
  var datarange = sheet.getDataRange();
  
  var lastrow = datarange.getLastRow();
  var values = datarange.getValues();// STATIC snapshot of the whole sheet
  
  var currentDate = new Date();// today
  var cutoffAge = 30.0; // Days
  
  // Index variables //////////////////////////////////////////////
  var valueIdx = 0; // Index for the 'values' variable - for reading values
  var sheetIdx = 0; // Index for the sheet rows - to keep track of which row we are on
  var delCount = 0; // No of deleted rows

  /* Index Variable Notes -----------------------------------------------
  -
  - When a row is deleted, the row is removed from the sheet - therefore
  - the next time you do sheet.deleteRow(), the row number to be provided
  - should take into account that there might be a previously deleted row.
  - This is done by using delCount and sheetIdx.
  - sheetIdx is always delCount steps behind valueIndex. The more 
  - rows we delete, the more sheetIdx is behind valueIdx. This enables
  - this code to keep the deletion and value reading in sync. 
  -
  - This complication was a result of having to read the sheet from 
  - top to bottom instead of bottom to top as originally written.
  *//////////////////////////////////////////////////////////////////////
  
  var startRowIdx = 2; // Skip the header row
  var dateColIdx = 0;  // Read the date from this column index
  
  for (valueIdx = startRowIdx; valueIdx <= lastrow; valueIdx++) {
    
    var tempDateRaw = values[valueIdx-1][dateColIdx];
    var tempDate = new Date(tempDateRaw);
    var diff = datediff(tempDate, currentDate);
    
    sheetIdx = valueIdx - delCount;
    
    if (tempDateRaw) {
      if (diff > cutoffAge) {
//        Logger.log("%s %s Diffs %s DELETING", valueIdx, tempDateRaw, diff); 
        sheet.deleteRow(sheetIdx);
        delCount++;
      } else if (diff < -2) {
//        Logger.log("%s %s Diffs %s STOPPING", valueIdx, tempDateRaw, diff); 
        break;
      } else {
        Logger.log("%s %s", valueIdx, tempDateRaw);
      }
    } else {
//      Logger.log("%s %s NO DATE", valueIdx, tempDateRaw); 
    }
  }//closes for loop
}//closes function

function datediff(first, second) {
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    return Math.round((second-first)/(1000*60*60*24), 2);
}