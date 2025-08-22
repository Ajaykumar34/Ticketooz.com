import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Download, TrendingUp, Save } from "lucide-react";
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
  totalCommissionBase: number;
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
  totalGSTWB: number;
  totalGSTOther: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
}

interface StateWiseData extends FinancialData {
  state: string;
}

interface EventWiseData extends FinancialData {
  eventId: string;
  eventName: string;
}

const FinancialReport = () => {
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
      console.log("Fetching events for financial report...");
      
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
        console.log("Fetched events for financial report:", eventsData);
        setEvents(eventsData);
        
        if (eventsData.length === 0) {
          toast.error("No events found in the database. Please create events first.");
        } else {
          console.log(`Found ${eventsData.length} events for financial reporting`);
        }
      }
    } catch (error) {
      console.error("Error in fetchEvents:", error);
      toast.error("Failed to fetch events");
    } finally {
      setEventsLoading(false);
    }
  };

  const processTransactionItems = (bookings: any[], eventPricingData: any[]): TransactionItem[] => {
    return bookings.map(booking => {
      // Get base price from actual booking data
      let basePrice = 0;
      let actualConvenienceFee = 0;
      let actualCommission = 0;
      const quantity = Number(booking.quantity) || 1;
      
      // First try to get pricing from seat_numbers if available
      if (booking.seat_numbers && Array.isArray(booking.seat_numbers) && booking.seat_numbers.length > 0) {
        const seatData = booking.seat_numbers[0]; // Get first seat for pricing reference
        if (seatData && typeof seatData === 'object' && seatData.price) {
          basePrice = Number(seatData.price) || 0;
          actualConvenienceFee = Number(seatData.convenience_fee) || 0;
          actualCommission = Number(seatData.commission) || 0;
        }
      } else {
        // For general admission, use total_amount and calculate backwards
        const totalAmount = Number(booking.total_amount) || 0;
        
        // Find pricing configuration for this event
        const eventPricing = eventPricingData.find(pricing => 
          pricing.event_id === booking.event_id
        );
        
        if (eventPricing) {
          // Calculate convenience fee based on configuration
          if (eventPricing.convenience_fee_type === 'percentage') {
            // If percentage, reverse calculate base price from total
            const convenienceFeeRate = eventPricing.convenience_fee_value / 100;
            basePrice = totalAmount / (1 + convenienceFeeRate) / quantity;
            actualConvenienceFee = (totalAmount - (basePrice * quantity)) / quantity;
          } else {
            // Fixed convenience fee
            actualConvenienceFee = eventPricing.convenience_fee_value || 0;
            basePrice = (totalAmount - (actualConvenienceFee * quantity)) / quantity;
          }
          
          // Calculate commission
          if (eventPricing.commission_type === 'percentage') {
            actualCommission = (basePrice * eventPricing.commission_value) / 100;
          } else {
            actualCommission = eventPricing.commission_value || 0;
          }
        } else {
          // Fallback to stored values if pricing data not found
          basePrice = Number(booking.base_price) || totalAmount / quantity;
          actualConvenienceFee = Number(booking.convenience_fee) || 0;
          actualCommission = Number(booking.commission) || 0;
        }
      }
      
      console.log(`Processing booking ${booking.id}: basePrice=${basePrice}, quantity=${quantity}, actualConvenienceFee=${actualConvenienceFee}, actualCommission=${actualCommission}, totalAmount=${booking.total_amount}`);
      
      return {
        id: booking.id,
        eventId: booking.event_id || 'unknown',
        eventName: booking.events?.name || 'Unknown Event',
        ticketPrice: basePrice, // Per ticket base price
        convenienceFee: actualConvenienceFee, // Per ticket convenience fee
        commission: actualCommission, // Per ticket commission
        actualCommission: actualCommission * 0.84745, // Per ticket actual commission
        gstOnActualCommission: actualCommission * 0.15255, // Per ticket GST on commission
        gstOnConvenienceBaseFee: actualConvenienceFee * 0.15255, // Per ticket GST on convenience
        totalAmount: basePrice + actualConvenienceFee, // Per ticket total amount
        customerState: booking.customer_state || 'Unknown',
        eventState: booking.events?.venues?.state || 'Unknown',
        createdAt: booking.created_at,
        quantity: quantity
      };
    });
  };

  const calculateActualFinancialMetrics = (transactions: any[]): FinancialData => {
    console.log("Calculating actual financial metrics from transactions:", transactions.length);
    
    if (transactions.length === 0) {
      return {
        totalSaleValue: 0,
        totalTicketPrice: 0,
        totalCommission: 0,
        totalCommissionBase: 0,
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
        totalGSTWB: 0,
        totalGSTOther: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalIGST: 0,
      };
    }

    const totals = transactions.reduce((acc, transaction) => {
      const ticketPrice = Number(transaction.ticket_price) || 0;
      const convenienceFee = Number(transaction.convenience_fee) || 0;
      const convenienceBaseFee = Number(transaction.convenience_base_fee) || 0;
      const commission = Number(transaction.commission) || 0;
      const actualCommission = Number(transaction.actual_commission) || 0;
      const gstOnActualCommission = Number(transaction.gst_on_actual_commission) || 0;
      const gstOnConvenienceBaseFee = Number(transaction.gst_on_convenience_base_fee) || 0;
      const reimbursableTicketPrice = Number(transaction.reimbursable_ticket_price) || 0;

      // Determine if WB transaction
      const isWBEvent = transaction.is_wb_event || transaction.event_state === 'West Bengal';
      const isWBCustomer = transaction.is_wb_customer || transaction.customer_state === 'West Bengal';

      // Add to totals
      acc.totalTicketPrice += ticketPrice;
      acc.totalConvenienceFee += convenienceFee;
      acc.totalConvenienceBaseFee += convenienceBaseFee;
      acc.totalCommission += commission;
      acc.totalCommissionBase += commission; // Commission base is same as commission
      acc.totalActualCommission += actualCommission;
      acc.totalGstOnActualCommission += gstOnActualCommission;
      acc.totalGstOnConvenienceBaseFee += gstOnConvenienceBaseFee;
      acc.totalReimbursableTicketPrice += reimbursableTicketPrice;

      // Calculate GST components
      const totalGST = gstOnActualCommission + gstOnConvenienceBaseFee;

      // GST breakdown by WB status
      if (isWBEvent && isWBCustomer) {
        // Intra-state: CGST (9%) + SGST (9%)
        acc.totalGstOnActualCommissionWB += gstOnActualCommission;
        acc.totalGstOnConvenienceBaseFeeWB += gstOnConvenienceBaseFee;
        acc.totalGSTWB += totalGST;
        acc.totalCGST += totalGST * 0.5; // 9% CGST
        acc.totalSGST += totalGST * 0.5; // 9% SGST
      } else {
        // Inter-state: IGST (18%)
        acc.totalGstOnActualCommissionOther += gstOnActualCommission;
        acc.totalGstOnConvenienceBaseFeeOther += gstOnConvenienceBaseFee;
        acc.totalGSTOther += totalGST;
        acc.totalIGST += totalGST; // 18% IGST
      }

      return acc;
    }, {
      totalTicketPrice: 0,
      totalConvenienceFee: 0,
      totalConvenienceBaseFee: 0,
      totalCommission: 0,
      totalCommissionBase: 0,
      totalActualCommission: 0,
      totalGstOnActualCommission: 0,
      totalReimbursableTicketPrice: 0,
      totalGstOnConvenienceBaseFee: 0,
      totalGstOnActualCommissionWB: 0,
      totalGstOnActualCommissionOther: 0,
      totalGstOnConvenienceBaseFeeWB: 0,
      totalGstOnConvenienceBaseFeeOther: 0,
      totalGSTWB: 0,
      totalGSTOther: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
    });

    const result = {
      ...totals,
      totalSaleValue: totals.totalTicketPrice + totals.totalConvenienceFee,
    };

    console.log("Calculated actual financial metrics:", result);
    return result;
  };

  const calculateFinancialMetrics = (bookings: any[], eventPricingData: any[]): FinancialData => {
    console.log("Calculating metrics for bookings:", bookings.length);
    console.log("Event pricing data available:", eventPricingData.length);
    
    if (bookings.length === 0) {
      console.log("No bookings to calculate metrics for");
      return {
        totalSaleValue: 0,
        totalTicketPrice: 0,
        totalCommission: 0,
        totalCommissionBase: 0,
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
        totalGSTWB: 0,
        totalGSTOther: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalIGST: 0,
      };
    }
    
    const totals = bookings.reduce((acc, booking) => {
      const basePrice = Number(booking.base_price) || Number(booking.total_price) || 0; // A (per ticket)
      const quantity = Number(booking.quantity) || 1; // Number of tickets
      
      // Get actual pricing configuration from event_seat_pricing table
      const eventPricing = eventPricingData.find(pricing => 
        pricing.event_id === booking.event_id
      );
      
      // Calculate actual convenience fee and commission based on pricing config
      let actualConvenienceFeePerTicket = 0;
      let actualCommissionPerTicket = 0;
      
      if (eventPricing) {
        // Calculate convenience fee per ticket
        if (eventPricing.convenience_fee_type === 'percentage') {
          actualConvenienceFeePerTicket = (basePrice * eventPricing.convenience_fee_value) / 100;
        } else {
          actualConvenienceFeePerTicket = eventPricing.convenience_fee_value || 0;
        }
        
        // Calculate commission per ticket
        if (eventPricing.commission_type === 'percentage') {
          actualCommissionPerTicket = (basePrice * eventPricing.commission_value) / 100;
        } else {
          actualCommissionPerTicket = eventPricing.commission_value || 0;
        }
      } else {
        // Fallback to stored values if pricing data not found
        actualConvenienceFeePerTicket = Number(booking.convenience_fee) || 0;
        actualCommissionPerTicket = Number(booking.commission) || 0;
      }
      
      // Calculate totals by multiplying by quantity (sum of all individual tickets)
      const totalTicketPrice = basePrice * quantity; // Sum of all ticket base prices
      const totalConvenienceFee = actualConvenienceFeePerTicket * quantity; // Sum of all convenience fees
      const totalCommission = actualCommissionPerTicket * quantity; // Sum of all commissions
      
      const convenienceBaseFee = totalConvenienceFee * 0.84745; // C = 84.745% of total convenience fee
      const gstOnConvenienceBaseFee = totalConvenienceFee - convenienceBaseFee; // D = total convenience fee - C
      const actualCommission = totalCommission * 0.84745; // G = 84.745% of F  
      const gstOnActualCommission = totalCommission - actualCommission; // H = F - G
      const reimbursableTicketPrice = totalTicketPrice - totalCommission; // K = total base price - F

      console.log(`Booking ${booking.id} calculations:`, {
        basePrice,
        quantity,
        totalTicketPrice,
        actualConvenienceFeePerTicket,
        totalConvenienceFee,
        convenienceBaseFee,
        gstOnConvenienceBaseFee,
        totalCommission,
        actualCommission,
        gstOnActualCommission
      });

      // Using venue state as fallback since we don't have user state
      const eventState = booking.events?.venues?.state || 'Unknown';
      const customerState = booking.customer_state || 'Unknown';

      const isWBEvent = eventState === 'West Bengal';
      const isWBCustomer = customerState === 'West Bengal';

      // Sum all individual tickets
      acc.totalTicketPrice += totalTicketPrice; // Sum of all ticket base prices
      acc.totalConvenienceFee += totalConvenienceFee; // Sum of all convenience fees
      acc.totalConvenienceBaseFee += convenienceBaseFee;
      acc.totalGstOnConvenienceBaseFee += gstOnConvenienceBaseFee;
      acc.totalCommission += totalCommission; // Sum of all commissions
      acc.totalCommissionBase += totalCommission; // Commission base is same as commission
      acc.totalActualCommission += actualCommission;
      acc.totalGstOnActualCommission += gstOnActualCommission;
      acc.totalReimbursableTicketPrice += reimbursableTicketPrice;

      // Calculate GST components for legacy function
      const totalGST = gstOnActualCommission + gstOnConvenienceBaseFee;

      if (isWBEvent && isWBCustomer) {
        acc.totalGstOnActualCommissionWB += gstOnActualCommission;
        acc.totalGstOnConvenienceBaseFeeWB += gstOnConvenienceBaseFee;
        acc.totalGSTWB += totalGST;
        acc.totalCGST += totalGST * 0.5; // 9% CGST
        acc.totalSGST += totalGST * 0.5; // 9% SGST
      } else {
        acc.totalGstOnActualCommissionOther += gstOnActualCommission;
        acc.totalGstOnConvenienceBaseFeeOther += gstOnConvenienceBaseFee;
        acc.totalGSTOther += totalGST;
        acc.totalIGST += totalGST; // 18% IGST
      }

      return acc;
    }, {
      totalTicketPrice: 0,
      totalConvenienceFee: 0,
      totalConvenienceBaseFee: 0,
      totalGstOnConvenienceBaseFee: 0,
      totalCommission: 0,
      totalActualCommission: 0,
      totalGstOnActualCommission: 0,
      totalReimbursableTicketPrice: 0,
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

    console.log("Calculated financial metrics (sum of all individual tickets):", result);
    console.log("Convenience fee totals:", {
      totalConvenienceFee: result.totalConvenienceFee,
      totalConvenienceBaseFee: result.totalConvenienceBaseFee,
      totalGstOnConvenienceBaseFee: result.totalGstOnConvenienceBaseFee,
      totalGstOnConvenienceBaseFeeWB: result.totalGstOnConvenienceBaseFeeWB,
      totalGstOnConvenienceBaseFeeOther: result.totalGstOnConvenienceBaseFeeOther
    });
    
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

    console.log("Generating report with params:", { startDate, endDate, reportType, selectedEventId });
    setLoading(true);
    
    try {
      // Fetch financial transactions directly from the financial_transactions table
      let financialQuery = supabase
        .from("financial_transactions")
        .select("*")
        .gte("created_at", startDate + 'T00:00:00Z')
        .lte("created_at", endDate + 'T23:59:59Z');

      if (reportType === 'event' && selectedEventId) {
        financialQuery = financialQuery.eq("event_id", selectedEventId);
        console.log("Filtering by event_id:", selectedEventId);
      }

      console.log("Executing financial transactions query...");
      const { data: financialTransactions, error: financialError } = await financialQuery;

      if (financialError) {
        console.error("Error fetching financial transaction data:", financialError);
        toast.error(`Error fetching financial data: ${financialError.message}`);
        return;
      }

      console.log("Financial transactions data:", financialTransactions);

      if (!financialTransactions?.length) {
        console.log("No financial transactions found for the given criteria");
        
        if (reportType === 'event') {
          const eventName = events.find(e => e.id === selectedEventId)?.name || 'Unknown Event';
          toast.error(`No financial transaction data found for event "${eventName}" in the selected date range.`);
        } else {
          toast.error('No financial transaction data found for the selected date range.');
        }
        
        setOverallData(null);
        setStateWiseData([]);
        setEventWiseData(null);
        setTransactionItems([]);
        return;
      }

      // Calculate actual financial metrics from real data
      const overallMetrics = calculateActualFinancialMetrics(financialTransactions);

      // Get event details for transaction items
      const eventIds = [...new Set(financialTransactions.map(t => t.event_id))];
      const { data: eventDetails } = await supabase
        .from("events")
        .select("id, name")
        .in("id", eventIds);

      // Process transaction items for itemized view
      const items = financialTransactions.map(transaction => ({
        id: transaction.id,
        eventId: transaction.event_id,
        eventName: eventDetails?.find(e => e.id === transaction.event_id)?.name || 'Unknown Event',
        ticketPrice: Number(transaction.ticket_price) || 0,
        convenienceFee: Number(transaction.convenience_fee) || 0,
        commission: Number(transaction.commission) || 0,
        actualCommission: Number(transaction.actual_commission) || 0,
        gstOnActualCommission: Number(transaction.gst_on_actual_commission) || 0,
        gstOnConvenienceBaseFee: Number(transaction.gst_on_convenience_base_fee) || 0,
        totalAmount: Number(transaction.ticket_price) + Number(transaction.convenience_fee),
        customerState: transaction.customer_state || 'Unknown',
        eventState: transaction.event_state || 'Unknown',
        createdAt: transaction.created_at,
        quantity: 1 // Each financial transaction represents one ticket
      }));

      setTransactionItems(items);

      if (reportType === 'overall' || reportType === 'itemized') {
        setOverallData(overallMetrics);

        // Calculate state-wise breakdown using customer state
        const stateGroups = financialTransactions.reduce((acc, transaction) => {
          const state = transaction.customer_state || 'Unknown';
          if (!acc[state]) acc[state] = [];
          acc[state].push(transaction);
          return acc;
        }, {} as Record<string, any[]>);

        const stateWise = Object.entries(stateGroups).map(([state, stateTransactions]) => ({
          state,
          ...calculateActualFinancialMetrics(stateTransactions)
        }));

        console.log("State-wise data:", stateWise);
        setStateWiseData(stateWise);
        setEventWiseData(null);
      } else {
        const eventInfo = events.find(e => e.id === selectedEventId);
        
        const eventWiseResult = {
          ...overallMetrics,
          eventId: selectedEventId,
          eventName: eventInfo?.name || 'Unknown Event'
        };

        console.log("Event-wise data:", eventWiseResult);
        setEventWiseData(eventWiseResult);
        setOverallData(null);
        setStateWiseData([]);
      }

      toast.success('Report generated successfully with actual financial data');
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    if ((reportType === 'overall' || reportType === 'itemized') && transactionItems.length > 0) {
      // Itemized transactions sheet - now showing per ticket values with quantity
      const itemizedData = [
        ['Financial Report - Itemized Transactions (Sum of All Tickets)'],
        ['Date Range:', `${startDate} to ${endDate}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Event Name', 'Per Ticket Price', 'Per Ticket Conv Fee', 'Per Ticket Commission', 'Per Ticket Actual Commission', 'Per Ticket GST on Commission', 'Per Ticket Total', 'Quantity', 'Total for All Tickets', 'Customer State', 'Event State', 'Date'],
        ...transactionItems.map(item => [
          item.eventName,
          item.ticketPrice.toFixed(2),
          item.convenienceFee.toFixed(2),
          item.commission.toFixed(2),
          item.actualCommission.toFixed(2),
          item.gstOnActualCommission.toFixed(2),
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
        ['Financial Report - Overall Summary (Sum of All Individual Tickets)'],
        ['Date Range:', `${startDate} to ${endDate}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Metric', 'Code', 'Value'],
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
        ['Total Commission Base', 'AO', overallData.totalCommissionBase.toFixed(2)],
        ['Total GST - WB (CGST + SGST)', 'AP', overallData.totalGSTWB.toFixed(2)],
        ['Total GST - Other (IGST)', 'AQ', overallData.totalGSTOther.toFixed(2)],
        ['Total CGST (9%)', 'AR', overallData.totalCGST.toFixed(2)],
        ['Total SGST (9%)', 'AS', overallData.totalSGST.toFixed(2)],
        ['Total IGST (18%)', 'AT', overallData.totalIGST.toFixed(2)],
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
        ['Financial Report - Event Wise (Sum of All Individual Tickets)'],
        ['Date Range:', `${startDate} to ${endDate}`],
        ['Event:', eventWiseData.eventName],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Metric', 'Code', 'Value'],
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
        ['Event GST on Convenience Base Fee - Other', 'BN', eventWiseData.totalGstOnConvenienceBaseFeeOther.toFixed(2)],
        ['Event Commission Base', 'BO', eventWiseData.totalCommissionBase.toFixed(2)],
        ['Event GST - WB (CGST + SGST)', 'BP', eventWiseData.totalGSTWB.toFixed(2)],
        ['Event GST - Other (IGST)', 'BQ', eventWiseData.totalGSTOther.toFixed(2)],
        ['Event CGST (9%)', 'BR', eventWiseData.totalCGST.toFixed(2)],
        ['Event SGST (9%)', 'BS', eventWiseData.totalSGST.toFixed(2)],
        ['Event IGST (18%)', 'BT', eventWiseData.totalIGST.toFixed(2)]
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(eventSheet);
      XLSX.utils.book_append_sheet(workbook, ws, 'Event Report');
    }

    const fileName = `Financial_Report_SumOfAllTickets_${reportType}_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Report exported successfully');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Financial Report (Sum of All Individual Tickets)
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
            <p><strong>Actual Financial Data:</strong></p>
            <p>• Events in database: {events.length}</p>
            <p>• Current date range: {startDate || 'Not set'} to {endDate || 'Not set'}</p>
            {reportType === 'event' && (
              <p>• Selected event: {selectedEventId ? events.find(e => e.id === selectedEventId)?.name || 'Unknown' : 'None'}</p>
            )}
            <p>• Transaction items loaded: {transactionItems.length}</p>
            <p>• <strong>Data source:</strong> financial_transactions table (actual calculated values)</p>
            <p>• <strong>NEW:</strong> All values are calculated from real financial transaction data</p>
            <p>• Includes: CGST, SGST, IGST breakdown for WB and other states</p>
          </div>
        </CardContent>
      </Card>

      {/* Itemized Transactions View */}
      {(reportType === 'itemized' || reportType === 'overall') && transactionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Itemized Transaction Details (Per Ticket + Quantity)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead className="text-right">Per Ticket Price</TableHead>
                  <TableHead className="text-right">Per Ticket Conv Fee</TableHead>
                  <TableHead className="text-right">Per Ticket Commission</TableHead>
                  <TableHead className="text-right">Per Ticket Actual Commission</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Amount (All Tickets)</TableHead>
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
                <TableRow>
                  <TableCell>Total Commission Base</TableCell>
                  <TableCell>AO</TableCell>
                  <TableCell className="text-right">₹{overallData.totalCommissionBase.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST - WB (CGST + SGST)</TableCell>
                  <TableCell>AP</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGSTWB.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total GST - Other (IGST)</TableCell>
                  <TableCell>AQ</TableCell>
                  <TableCell className="text-right">₹{overallData.totalGSTOther.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total CGST (9%)</TableCell>
                  <TableCell>AR</TableCell>
                  <TableCell className="text-right">₹{overallData.totalCGST.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total SGST (9%)</TableCell>
                  <TableCell>AS</TableCell>
                  <TableCell className="text-right">₹{overallData.totalSGST.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total IGST (18%)</TableCell>
                  <TableCell>AT</TableCell>
                  <TableCell className="text-right">₹{overallData.totalIGST.toLocaleString()}</TableCell>
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
                <TableRow>
                  <TableCell>Event Commission Base</TableCell>
                  <TableCell>BO</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalCommissionBase.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST - WB (CGST + SGST)</TableCell>
                  <TableCell>BP</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGSTWB.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event GST - Other (IGST)</TableCell>
                  <TableCell>BQ</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalGSTOther.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event CGST (9%)</TableCell>
                  <TableCell>BR</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalCGST.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event SGST (9%)</TableCell>
                  <TableCell>BS</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalSGST.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Event IGST (18%)</TableCell>
                  <TableCell>BT</TableCell>
                  <TableCell className="text-right">₹{eventWiseData.totalIGST.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialReport;
