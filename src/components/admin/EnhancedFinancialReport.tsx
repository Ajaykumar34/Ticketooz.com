import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Download, FileSpreadsheet, TrendingUp, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface TransactionItem {
  id: string;
  eventId: string;
  eventName: string;
  ticketPrice: number;
  convenienceFee: number;
  commission: number;
  actualCommission: number;
  gstOnActualCommission: number;
  gstOnConvenienceBaseFee: number;
  totalAmount: number;
  customerState: string;
  eventState: string;
  createdAt: string;
  quantity: number;
}

interface FinancialData {
  totalSaleValue: number;
  totalTicketPrice: number;
  totalCommission: number;
  totalActualCommission: number;
  totalGstOnActualCommission: number;
  totalGstOnActualCommissionWB: number;
  totalGstOnActualCommissionOther: number;
  totalReimbursableTicketPrice: number;
  totalConvenienceFee: number;
  totalConvenienceBaseFee: number;
  totalGstOnConvenienceBaseFee: number;
  totalGstOnConvenienceBaseFeeWB: number;
  totalGstOnConvenienceBaseFeeOther: number;
}

interface StateWiseData extends FinancialData {
  state: string;
}

interface EventWiseData extends FinancialData {
  eventId: string;
  eventName: string;
}

const EnhancedFinancialReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [reportType, setReportType] = useState<'overall' | 'event' | 'itemized'>('overall');
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [reportName, setReportName] = useState('');
  
  // Financial data states
  const [overallData, setOverallData] = useState<FinancialData | null>(null);
  const [stateWiseData, setStateWiseData] = useState<StateWiseData[]>([]);
  const [eventWiseData, setEventWiseData] = useState<EventWiseData | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setEventsLoading(true);
    try {
      console.log("Fetching events for enhanced financial report...");
      
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("id, name, start_datetime, end_datetime, status")
        .order("start_datetime", { ascending: false });
      
      if (error) {
        console.error("Error fetching events:", error);
        toast.error("Failed to fetch events");
        return;
      }
      
      if (eventsData) {
        console.log("Fetched events for enhanced financial report:", eventsData);
        setEvents(eventsData);
        
        if (eventsData.length === 0) {
          toast.error("No events found in the database. Please create events first.");
        } else {
          console.log(`Found ${eventsData.length} events for enhanced financial reporting`);
        }
      }
    } catch (error) {
      console.error("Error in fetchEvents:", error);
      toast.error("Failed to fetch events");
    } finally {
      setEventsLoading(false);
    }
  };

  const calculateConvenienceFeeBreakdown = (convenienceFee: number) => {
    // C = Convenience Fee Base = 84.745% of Convenience Fee
    const C = convenienceFee * 0.84745;
    
    // D = Convenience Fee GST = convenience fee - C
    const D = convenienceFee - C;
    
    return {
      convenienceFee: convenienceFee,
      convenienceBaseFee: C,
      gstOnConvenienceBaseFee: D
    };
  };

  const processTransactionItems = (transactions: any[]): TransactionItem[] => {
    return transactions.map(t => {
      const basePrice = Number(t.base_price) || Number(t.ticket_price) || 0;
      // Fix: Safely access quantity with fallback to 1
      const quantity = Number(t.quantity) || 1;
      // Use the actual convenience fee from database
      const convenienceFee = Number(t.convenience_fee) || 0;
      const convenienceBreakdown = calculateConvenienceFeeBreakdown(convenienceFee);
      
      return {
        id: t.id,
        eventId: t.event_id || 'unknown',
        eventName: t.events?.name || 'Unknown Event',
        ticketPrice: basePrice, // Per ticket base price
        convenienceFee: convenienceBreakdown.convenienceFee, // Per ticket convenience fee
        commission: Number(t.commission) || 0, // Per ticket commission
        actualCommission: Number(t.actual_commission) || 0, // Per ticket actual commission
        gstOnActualCommission: Number(t.gst_on_actual_commission) || 0, // Per ticket GST
        gstOnConvenienceBaseFee: convenienceBreakdown.gstOnConvenienceBaseFee, // Per ticket GST on convenience
        totalAmount: basePrice + convenienceBreakdown.convenienceFee, // Per ticket total
        customerState: t.customer_state || 'Unknown',
        eventState: t.events?.venues?.state || t.event_state || 'Unknown',
        createdAt: t.created_at,
        quantity: quantity
      };
    });
  };

  const calculateFinancialMetrics = (transactions: any[]): FinancialData => {
    console.log("Calculating enhanced metrics for transactions:", transactions.length);
    
    if (transactions.length === 0) {
      console.log("No transactions to calculate enhanced metrics for");
      return {
        totalSaleValue: 0,
        totalTicketPrice: 0,
        totalCommission: 0,
        totalActualCommission: 0,
        totalGstOnActualCommission: 0,
        totalGstOnActualCommissionWB: 0,
        totalGstOnActualCommissionOther: 0,
        totalReimbursableTicketPrice: 0,
        totalConvenienceFee: 0,
        totalConvenienceBaseFee: 0,
        totalGstOnConvenienceBaseFee: 0,
        totalGstOnConvenienceBaseFeeWB: 0,
        totalGstOnConvenienceBaseFeeOther: 0,
      };
    }
    
    const totals = transactions.reduce((acc, t) => {
      const basePrice = Number(t.base_price) || Number(t.ticket_price) || 0;
      // Fix: Safely access quantity with fallback to 1
      const quantity = Number(t.quantity) || 1;
      // Use actual convenience fee from database
      const convenienceFee = Number(t.convenience_fee) || 0;
      
      // Calculate totals by multiplying by quantity (sum of all individual tickets)
      const totalBasePrice = basePrice * quantity;
      const totalConvenienceFee = convenienceFee * quantity;
      
      const convenienceBreakdown = calculateConvenienceFeeBreakdown(totalConvenienceFee);
      const commission = Number(t.commission) || 0;
      const actualCommission = Number(t.actual_commission) || 0;
      const gstOnActualCommission = Number(t.gst_on_actual_commission) || 0;
      const reimbursableTicketPrice = Number(t.reimbursable_ticket_price) || 0;

      // Multiply by quantity to get sum of all tickets
      const totalCommission = commission * quantity;
      const totalActualCommission = actualCommission * quantity;
      const totalGstOnActualCommission = gstOnActualCommission * quantity;
      const totalReimbursableTicketPrice = reimbursableTicketPrice * quantity;

      const eventState = t.event_state || t.venues?.state || 'Unknown';
      const customerState = t.customer_state || 'Unknown';

      const isWBEvent = eventState === 'West Bengal';
      const isWBCustomer = customerState === 'West Bengal';

      // Sum all individual tickets
      acc.totalTicketPrice += totalBasePrice; // Sum of all ticket base prices
      acc.totalConvenienceFee += convenienceBreakdown.convenienceFee; // Sum of all convenience fees
      acc.totalConvenienceBaseFee += convenienceBreakdown.convenienceBaseFee;
      acc.totalCommission += totalCommission; // Sum of all commissions
      acc.totalActualCommission += totalActualCommission;
      acc.totalGstOnActualCommission += totalGstOnActualCommission;
      acc.totalReimbursableTicketPrice += totalReimbursableTicketPrice;
      acc.totalGstOnConvenienceBaseFee += convenienceBreakdown.gstOnConvenienceBaseFee;

      if (isWBEvent) {
        acc.totalGstOnActualCommissionWB += totalGstOnActualCommission;
      } else {
        acc.totalGstOnActualCommissionOther += totalGstOnActualCommission;
      }

      if (isWBCustomer) {
        acc.totalGstOnConvenienceBaseFeeWB += convenienceBreakdown.gstOnConvenienceBaseFee;
      } else {
        acc.totalGstOnConvenienceBaseFeeOther += convenienceBreakdown.gstOnConvenienceBaseFee;
      }

      return acc;
    }, {
      totalTicketPrice: 0,
      totalConvenienceFee: 0,
      totalConvenienceBaseFee: 0,
      totalCommission: 0,
      totalActualCommission: 0,
      totalGstOnActualCommission: 0,
      totalReimbursableTicketPrice: 0,
      totalGstOnConvenienceBaseFee: 0,
      totalGstOnActualCommissionWB: 0,
      totalGstOnActualCommissionOther: 0,
      totalGstOnConvenienceBaseFeeWB: 0,
      totalGstOnConvenienceBaseFeeOther: 0,
    });

    const result = {
      ...totals,
      // Total Sale Value = sum of all individual tickets (base price + convenience fee)
      totalSaleValue: totals.totalTicketPrice + totals.totalConvenienceFee,
    };

    console.log("Calculated enhanced financial metrics (sum of all individual tickets):", result);
    return result;
  };

  const saveReport = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    if (!overallData && !eventWiseData && transactionItems.length === 0) {
      toast.error('No report data to save');
      return;
    }

    try {
      const reportData = {
        overall: overallData ? { ...overallData } : null,
        stateWise: stateWiseData.map(state => ({ ...state })),
        eventWise: eventWiseData ? { ...eventWiseData } : null,
        transactionItems: transactionItems,
        generatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('financial_reports')
        .insert({
          report_name: reportName.trim(),
          report_type: reportType,
          date_range_start: startDate + 'T00:00:00Z',
          date_range_end: endDate + 'T23:59:59Z',
          report_data: reportData as any,
          filters_applied: {
            reportType,
            selectedEventId: reportType === 'event' ? selectedEventId : null
          } as any
        });

      if (error) {
        console.error('Error saving report:', error);
        throw error;
      }

      toast.success('Report saved successfully');
      setReportName('');
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast.error(`Failed to save report: ${error.message}`);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (reportType === 'event' && !selectedEventId) {
      toast.error('Please select an event for event-wise report');
      return;
    }

    console.log("Generating enhanced report with params:", { startDate, endDate, reportType, selectedEventId });
    setLoading(true);
    
    try {
      const { count: transactionCount, error: countError } = await supabase
        .from("financial_transactions")
        .select("*", { count: 'exact', head: true });

      if (countError) {
        console.error("Error checking transaction count:", countError);
      } else {
        console.log("Total financial transactions in database:", transactionCount);
        
        if (transactionCount === 0) {
          toast.error("No financial transaction data found in the database. Please ensure bookings have been made and financial data has been recorded.");
          setLoading(false);
          return;
        }
      }

      let query = supabase
        .from("financial_transactions")
        .select(`
          *,
          events(
            id,
            name,
            venues(
              id,
              name,
              state
            )
          )
        `)
        .gte("created_at", startDate + 'T00:00:00')
        .lte("created_at", endDate + 'T23:59:59');

      if (reportType === 'event' && selectedEventId) {
        query = query.eq("event_id", selectedEventId);
        console.log("Filtering by event_id:", selectedEventId);
      }

      console.log("Executing enhanced financial transactions query...");
      const { data: transactions, error } = await query;

      if (error) {
        console.error("Error fetching enhanced financial data:", error);
        toast.error(`Error fetching data: ${error.message}`);
        return;
      }

      console.log("Raw enhanced transactions data:", transactions);

      if (!transactions?.length) {
        console.log("No transactions found for the given criteria");
        
        if (reportType === 'event') {
          const eventName = events.find(e => e.id === selectedEventId)?.name || 'Unknown Event';
          toast.error(`No financial data found for event "${eventName}" in the selected date range. Please check if there are any bookings for this event.`);
        } else {
          toast.error('No financial data found for the selected date range. Please check if there are any bookings in this period.');
        }
        
        setOverallData(null);
        setStateWiseData([]);
        setEventWiseData(null);
        setTransactionItems([]);
        return;
      }

      const processedTransactions = transactions.map(t => {
        const eventState = t.events?.venues?.state || 'Unknown';
        const customerState = t.customer_state || 'Unknown';
        
        return {
          ...t,
          event_state: eventState,
          customer_state: customerState,
          venues: { state: eventState },
          // Fix: Ensure quantity is properly set with fallback
          quantity: Number((t as any).quantity) || 1
        };
      });

      console.log("Processed enhanced transactions:", processedTransactions);

      // Process transaction items for itemized view
      const items = processTransactionItems(processedTransactions);
      setTransactionItems(items);

      if (reportType === 'overall' || reportType === 'itemized') {
        const overall = calculateFinancialMetrics(processedTransactions);
        setOverallData(overall);

        const stateGroups = processedTransactions.reduce((acc, t) => {
          const state = t.customer_state || 'Unknown';
          if (!acc[state]) acc[state] = [];
          acc[state].push(t);
          return acc;
        }, {} as Record<string, any[]>);

        const stateWise = Object.entries(stateGroups).map(([state, stateTransactions]) => ({
          state,
          ...calculateFinancialMetrics(stateTransactions)
        }));

        console.log("Enhanced state-wise data:", stateWise);
        setStateWiseData(stateWise);
        setEventWiseData(null);
      } else {
        const eventData = calculateFinancialMetrics(processedTransactions);
        const eventInfo = events.find(e => e.id === selectedEventId);
        
        const eventWiseResult = {
          ...eventData,
          eventId: selectedEventId,
          eventName: eventInfo?.name || 'Unknown Event'
        };

        console.log("Enhanced event-wise data:", eventWiseResult);
        setEventWiseData(eventWiseResult);
        setOverallData(null);
        setStateWiseData([]);
      }

      toast.success('Enhanced report generated successfully');
    } catch (error: any) {
      console.error("Error generating enhanced report:", error);
      toast.error(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    if ((reportType === 'overall' || reportType === 'itemized') && transactionItems.length > 0) {
      // Itemized transactions sheet - showing per ticket values with quantity
      const itemizedData = [
        ['Enhanced Financial Report - Itemized Transactions (Sum of All Tickets)'],
        ['Date Range:', `${startDate} to ${endDate}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Event Name', 'Per Ticket Base Price', 'Per Ticket Conv Fee', 'Per Ticket Commission', 'Per Ticket Actual Commission', 'Per Ticket Total', 'Quantity', 'Total for All Tickets', 'Customer State', 'Event State', 'Date'],
        ...transactionItems.map(item => [
          item.eventName,
          item.ticketPrice.toFixed(2),
          item.convenienceFee.toFixed(2),
          item.commission.toFixed(2),
          item.actualCommission.toFixed(2),
          item.totalAmount.toFixed(2),
          item.quantity,
          (item.totalAmount * item.quantity).toFixed(2),
          item.customerState,
          item.eventState,
          new Date(item.createdAt).toLocaleDateString()
        ])
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(itemizedData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Itemized Transactions');
    }
    
    if (reportType === 'overall' && overallData && stateWiseData.length > 0) {
      const overallSheet = [
        ['Enhanced Financial Report - Overall Summary (Sum of All Individual Tickets)'],
        ['Date Range:', `${startDate} to ${endDate}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Metric', 'Code', 'Amount (₹)'],
        ['Total Sale Value (Sum of All Tickets)', 'AA', overallData.totalSaleValue.toFixed(2)],
        ['Total Ticket Price (Sum of All Base Prices)', 'AB', overallData.totalTicketPrice.toFixed(2)],
        ['Total Commission (Sum of All Commissions)', 'AC', overallData.totalCommission.toFixed(2)],
        ['Total Actual Commission', 'AD', overallData.totalActualCommission.toFixed(2)],
        ['Total GST on Actual Commission', 'AE', overallData.totalGstOnActualCommission.toFixed(2)],
        ['Total GST on Actual Commission - WB', 'AF', overallData.totalGstOnActualCommissionWB.toFixed(2)],
        ['Total GST on Actual Commission - Other', 'AG', overallData.totalGstOnActualCommissionOther.toFixed(2)],
        ['Total Reimbursable Ticket Price', 'AH', overallData.totalReimbursableTicketPrice.toFixed(2)],
        ['Total Convenience Fee (Sum of All Conv Fees)', 'AJ', overallData.totalConvenienceFee.toFixed(2)],
        ['Total Convenience Base Fee', 'AK', overallData.totalConvenienceBaseFee.toFixed(2)],
        ['Total GST on Convenience Base Fee', 'AL', overallData.totalGstOnConvenienceBaseFee.toFixed(2)],
        ['Total GST on Convenience Base Fee - WB', 'AM', overallData.totalGstOnConvenienceBaseFeeWB.toFixed(2)],
        ['Total GST on Convenience Base Fee - Other', 'AN', overallData.totalGstOnConvenienceBaseFeeOther.toFixed(2)],
        [''],
        ['State-wise Breakdown (Sum of All Individual Tickets)'],
        ['State', 'Sale Value', 'Ticket Price', 'Commission', 'Actual Commission', 'GST on Commission'],
        ...stateWiseData.map(state => [
          state.state,
          state.totalSaleValue.toFixed(2),
          state.totalTicketPrice.toFixed(2),
          state.totalCommission.toFixed(2),
          state.totalActualCommission.toFixed(2),
          state.totalGstOnActualCommission.toFixed(2)
        ])
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(overallSheet);
      XLSX.utils.book_append_sheet(workbook, ws, 'Overall Report');
    }
    
    if (reportType === 'event' && eventWiseData) {
      const eventSheet = [
        ['Enhanced Financial Report - Event Wise (Sum of All Individual Tickets)'],
        ['Date Range:', `${startDate} to ${endDate}`],
        ['Event:', eventWiseData.eventName],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Metric', 'Code', 'Amount (₹)'],
        ['Event Sale Value (Sum of All Tickets)', 'BA', eventWiseData.totalSaleValue.toFixed(2)],
        ['Event Ticket Price (Sum of All Base Prices)', 'BB', eventWiseData.totalTicketPrice.toFixed(2)],
        ['Event Commission (Sum of All Commissions)', 'BC', eventWiseData.totalCommission.toFixed(2)],
        ['Event Actual Commission', 'BD', eventWiseData.totalActualCommission.toFixed(2)],
        ['Event GST on Actual Commission', 'BE', eventWiseData.totalGstOnActualCommission.toFixed(2)],
        ['Event GST on Actual Commission - WB', 'BF', eventWiseData.totalGstOnActualCommissionWB.toFixed(2)],
        ['Event GST on Actual Commission - Other', 'BG', eventWiseData.totalGstOnActualCommissionOther.toFixed(2)],
        ['Event Reimbursable Ticket Price', 'BH', eventWiseData.totalReimbursableTicketPrice.toFixed(2)],
        ['Event Convenience Fee (Sum of All Conv Fees)', 'BJ', eventWiseData.totalConvenienceFee.toFixed(2)],
        ['Event Convenience Base Fee', 'BK', eventWiseData.totalConvenienceBaseFee.toFixed(2)],
        ['Event GST on Convenience Base Fee', 'BL', eventWiseData.totalGstOnConvenienceBaseFee.toFixed(2)],
        ['Event GST on Convenience Base Fee - WB', 'BM', eventWiseData.totalGstOnConvenienceBaseFeeWB.toFixed(2)],
        ['Event GST on Convenience Base Fee - Other', 'BN', eventWiseData.totalGstOnConvenienceBaseFeeOther.toFixed(2)]
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(eventSheet);
      XLSX.utils.book_append_sheet(workbook, ws, 'Event Report');
    }

    const fileName = `Enhanced_Financial_Report_SumOfAllTickets_${reportType}_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Enhanced report exported successfully');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Enhanced Financial Report (Sum of All Individual Tickets)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <Select value={reportType} onValueChange={(value: 'overall' | 'event' | 'itemized') => {
                setReportType(value);
                if (value === 'overall' || value === 'itemized') {
                  setSelectedEventId('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall & State-wise</SelectItem>
                  <SelectItem value="event">Event-wise</SelectItem>
                  <SelectItem value="itemized">Itemized Transactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            {reportType === 'event' && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Event *</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId} disabled={eventsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder={eventsLoading ? "Loading events..." : "Choose event"} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {events.length === 0 && !eventsLoading && (
                  <p className="text-sm text-red-600 mt-1">No events found in database</p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-4 mb-4">
            <Button onClick={generateReport} disabled={loading}>
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            
            {(overallData || eventWiseData || transactionItems.length > 0) && (
              <>
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter report name to save"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={saveReport} variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    Save Report
                  </Button>
                </div>
              </>
            )}
          </div>
          
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p><strong>Enhanced Debug Info:</strong></p>
            <p>• Events in database: {events.length}</p>
            <p>• Current date range: {startDate || 'Not set'} to {endDate || 'Not set'}</p>
            {reportType === 'event' && (
              <p>• Selected event: {selectedEventId ? events.find(e => e.id === selectedEventId)?.name || 'Unknown' : 'None'}</p>
            )}
            <p>• Transaction items loaded: {transactionItems.length}</p>
            <p>• <strong>ENHANCED:</strong> All metrics now show sum of individual tickets (quantity * per-ticket-values)</p>
            <p>• Data source: financial_transactions table with actual convenience fees</p>
          </div>
        </CardContent>
      </Card>

      {/* Itemized Transactions View */}
      {(reportType === 'itemized' || reportType === 'overall') && transactionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Itemized Transaction Details (Per Ticket + Quantity = Sum of All Tickets)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead className="text-right">Per Ticket Base Price</TableHead>
                  <TableHead className="text-right">Per Ticket Conv Fee</TableHead>
                  <TableHead className="text-right">Per Ticket Commission</TableHead>
                  <TableHead className="text-right">Per Ticket Actual Commission</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Sale Value (All Tickets)</TableHead>
                  <TableHead>Customer State</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.eventName}</TableCell>
                    <TableCell className="text-right">₹{item.ticketPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{item.convenienceFee.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{item.commission.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{item.actualCommission.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-semibold">₹{(item.totalAmount * item.quantity).toLocaleString()}</TableCell>
                    <TableCell>{item.customerState}</TableCell>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Overall Report Display */}
      {reportType === 'overall' && overallData && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Financial Summary (Sum of All Individual Tickets)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total Sale Value (Sum of All Tickets)</TableCell>
                  <TableCell>AA</TableCell>
                  <TableCell className="text-right font-semibold">₹{overallData.totalSaleValue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Ticket Price (Sum of All Base Prices)</TableCell>
                  <TableCell>AB</TableCell>
                  <TableCell className="text-right">₹{overallData.totalTicketPrice.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Commission (Sum of All Commissions)</TableCell>
                  <TableCell>AC</TableCell>
                  <TableCell className="text-right">₹{overallData.totalCommission.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Actual Commission</TableCell>
                  <TableCell>AD</TableCell>
                  <TableCell className="text-right">₹{overallData.totalActualCommission.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST on Actual Commission</TableCell>
                  <TableCell>AE</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGstOnActualCommission.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST on Actual Commission (WB)</TableCell>
                  <TableCell>AF</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGstOnActualCommissionWB.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST on Actual Commission (Other)</TableCell>
                  <TableCell>AG</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGstOnActualCommissionOther.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Reimbursable Ticket Price</TableCell>
                  <TableCell>AH</TableCell>
                  <TableCell className="text-right">₹{overallData.totalReimbursableTicketPrice.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Convenience Fee (Sum of All Conv Fees)</TableCell>
                  <TableCell>AJ</TableCell>
                  <TableCell className="text-right">₹{overallData.totalConvenienceFee.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Convenience Base Fee</TableCell>
                  <TableCell>AK</TableCell>
                  <TableCell className="text-right">₹{overallData.totalConvenienceBaseFee.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST on Convenience Base Fee</TableCell>
                  <TableCell>AL</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGstOnConvenienceBaseFee.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST on Convenience Base Fee (WB)</TableCell>
                  <TableCell>AM</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGstOnConvenienceBaseFeeWB.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST on Convenience Base Fee (Other)</TableCell>
                  <TableCell>AN</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGstOnConvenienceBaseFeeOther.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* State-wise Report Display */}
      {reportType === 'overall' && stateWiseData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>State-wise Breakdown (Sum of All Individual Tickets)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Sale Value</TableHead>
                  <TableHead className="text-right">Ticket Price</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Actual Commission</TableHead>
                  <TableHead className="text-right">GST on Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stateWiseData.map((state, index) => (
                  <TableRow key={index}>
                    <TableCell>{state.state}</TableCell>
                    <TableCell className="text-right">₹{state.totalSaleValue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{state.totalTicketPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{state.totalCommission.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{state.totalActualCommission.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{state.totalGstOnActualCommission.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Event-wise Report Display */}
      {reportType === 'event' && eventWiseData && (
        <Card>
          <CardHeader>
            <CardTitle>Event-wise Financial Summary (Sum of All Individual Tickets): {eventWiseData.eventName}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Amount (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Event Sale Value (Sum of All Tickets)</TableCell>
                  <TableCell>BA</TableCell>
                  <TableCell className="text-right font-semibold">₹{eventWiseData.totalSaleValue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event Ticket Price (Sum of All Base Prices)</TableCell>
                  <TableCell>BB</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalTicketPrice.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event Commission (Sum of All Commissions)</TableCell>
                  <TableCell>BC</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalCommission.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event Actual Commission</TableCell>
                  <TableCell>BD</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalActualCommission.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST on Actual Commission</TableCell>
                  <TableCell>BE</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGstOnActualCommission.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST on Actual Commission (WB)</TableCell>
                  <TableCell>BF</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGstOnActualCommissionWB.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST on Actual Commission (Other)</TableCell>
                  <TableCell>BG</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGstOnActualCommissionOther.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event Reimbursable Ticket Price</TableCell>
                  <TableCell>BH</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalReimbursableTicketPrice.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event Convenience Fee (Sum of All Conv Fees)</TableCell>
                  <TableCell>BJ</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalConvenienceFee.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event Convenience Base Fee</TableCell>
                  <TableCell>BK</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalConvenienceBaseFee.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST on Convenience Base Fee</TableCell>
                  <TableCell>BL</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGstOnConvenienceBaseFee.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST on Convenience Base Fee (WB)</TableCell>
                  <TableCell>BM</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGstOnConvenienceBaseFeeWB.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST on Convenience Base Fee (Other)</TableCell>
                  <TableCell>BN</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGstOnConvenienceBaseFeeOther.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedFinancialReport;
