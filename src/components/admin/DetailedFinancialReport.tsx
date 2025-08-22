import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface StateFinancialData {
  state: string;
  totalSaleValue: number;
  totalTicketPrice: number;
  totalCommission: number;
  totalCommissionBase: number;
  totalCommissionGST: number;
  totalCommissionGSTWB: number;
  totalCommissionGSTOther: number;
  totalReimbursableTicketPrice: number;
  totalConvenienceFee: number;
  totalConvenienceFeeBase: number;
  totalConvenienceFeeGST: number;
  totalConvenienceFeeGSTWB: number;
  totalConvenienceFeeGSTOther: number;
  totalGSTWB: number;
  totalGSTOther: number;
  cgst: number;
  sgst: number;
  igst: number;
}

interface EventFinancialData extends StateFinancialData {
  eventId: string;
  eventName: string;
}

interface DetailedFinancialReportProps {
  onClose?: () => void;
}

const DetailedFinancialReport = ({ onClose }: DetailedFinancialReportProps) => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedEventData, setSelectedEventData] = useState<EventFinancialData | null>(null);
  const [allEventsData, setAllEventsData] = useState<StateFinancialData[]>([]);
  const [grandTotalData, setGrandTotalData] = useState<StateFinancialData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchFinancialData();
    }
  }, [dateRange, eventFilter]);

  const fetchEvents = async () => {
    try {
      console.log('[DetailedFinancialReport] Fetching events...');
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching events:', error);
        toast({
          title: "Error",
          description: "Failed to fetch events",
          variant: "destructive",
        });
        return;
      }

      console.log('[DetailedFinancialReport] Events fetched:', data?.length || 0);
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    }
  };

  const calculateConvenienceFeeBreakdown = (actualConvenienceFee: number) => {
    // C = Convenience Fee Base = 84.745% of Convenience Fee
    const C = actualConvenienceFee * 0.84745;
    
    // D = Convenience Fee GST = actual convenience fee - C
    const D = actualConvenienceFee - C;
    
    return {
      convenienceFee: actualConvenienceFee,
      convenienceFeeBase: C,
      convenienceFeeGST: D
    };
  };

  const calculateFinancialMetrics = (bookings: any[]): StateFinancialData => {
    console.log('[DetailedFinancialReport] Calculating metrics for bookings:', bookings.length);
    
    if (!bookings || bookings.length === 0) {
      return {
        state: '',
        totalSaleValue: 0,
        totalTicketPrice: 0,
        totalCommission: 0,
        totalCommissionBase: 0,
        totalCommissionGST: 0,
        totalCommissionGSTWB: 0,
        totalCommissionGSTOther: 0,
        totalReimbursableTicketPrice: 0,
        totalConvenienceFee: 0,
        totalConvenienceFeeBase: 0,
        totalConvenienceFeeGST: 0,
        totalConvenienceFeeGSTWB: 0,
        totalConvenienceFeeGSTOther: 0,
        totalGSTWB: 0,
        totalGSTOther: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
    }

    return bookings.reduce((acc, booking) => {
      // A = Base Ticket Price (per ticket or total for seat-based bookings)
      let basePrice = 0;
      const quantity = Number(booking.quantity) || 1;
      
      // Calculate base price and actual fees based on pricing configuration
      let actualConvenienceFeePerTicket = 0;
      let actualCommissionPerTicket = 0;
      
      const isSeatBased = booking.seat_numbers && Array.isArray(booking.seat_numbers) && booking.seat_numbers.length > 0;
      
      if (isSeatBased && booking.seat_numbers?.length > 0) {
        // For seat-based bookings, sum individual seat prices
        basePrice = booking.seat_numbers.reduce((sum: number, seat: any) => {
          return sum + (Number(seat.price) || 0);
        }, 0);
        
        // Use pricing configuration to calculate fees per ticket (average)
        const avgTicketPrice = basePrice / booking.seat_numbers.length;
        if (booking.pricing) {
          if (booking.pricing.convenience_fee_type === 'percentage') {
            actualConvenienceFeePerTicket = (avgTicketPrice * booking.pricing.convenience_fee_value) / 100;
          } else {
            actualConvenienceFeePerTicket = Number(booking.pricing.convenience_fee_value) || 0;
          }
          
          if (booking.pricing.commission_type === 'percentage') {
            actualCommissionPerTicket = (avgTicketPrice * booking.pricing.commission_value) / 100;
          } else {
            actualCommissionPerTicket = Number(booking.pricing.commission_value) || 0;
          }
        }
      } else {
        // For general admission, calculate from total_amount and pricing config
        const totalAmount = Number(booking.total_amount) || 0;
        
        if (booking.pricing && totalAmount > 0) {
          if (booking.pricing.convenience_fee_type === 'percentage') {
            // Reverse calculate base price from total amount
            const convenienceFeeRate = booking.pricing.convenience_fee_value / 100;
            basePrice = totalAmount / (1 + convenienceFeeRate) / quantity;
            actualConvenienceFeePerTicket = (basePrice * booking.pricing.convenience_fee_value) / 100;
          } else {
            actualConvenienceFeePerTicket = booking.pricing.convenience_fee_value || 0;
            basePrice = (totalAmount - (actualConvenienceFeePerTicket * quantity)) / quantity;
          }
          
          if (booking.pricing.commission_type === 'percentage') {
            actualCommissionPerTicket = (basePrice * booking.pricing.commission_value) / 100;
          } else {
            actualCommissionPerTicket = booking.pricing.commission_value || 0;
          }
        } else {
          // Fallback to stored values
          basePrice = Number(booking.base_price) || (totalAmount / quantity);
          actualConvenienceFeePerTicket = Number(booking.convenience_fee) || 0;
          actualCommissionPerTicket = Number(booking.commission) || 0;
        }
      }
      
      const totalBasePrice = basePrice;
      const totalConvenienceFee = actualConvenienceFeePerTicket * quantity;
      const totalCommission = actualCommissionPerTicket * quantity;
      
      console.log(`[DetailedFinancialReport] Booking ${booking.id} calculations:`, {
        basePrice,
        quantity,
        totalBasePrice,
        actualConvenienceFeePerTicket,
        actualCommissionPerTicket,
        totalConvenienceFee,
        totalCommission,
        bookingCommissionField: booking.commission,
        bookingConvenienceFeeField: booking.convenience_fee
      });
      
      // Calculate convenience fee breakdown using actual values
      const convenienceBreakdown = calculateConvenienceFeeBreakdown(totalConvenienceFee);
      
      // G = Commission Base = 84.745% of Commission  
      const commissionBase = totalCommission * 0.84745;
      
      // H = Commission GST = F - G
      const commissionGST = totalCommission - commissionBase;
      
      // Calculate total sale value: base price + convenience fee
      const totalSaleValue = totalBasePrice + convenienceBreakdown.convenienceFee;
      
      // K = Reimbursable Ticket Price = Total Base Price - Commission
      const reimbursableTicketPrice = totalBasePrice - totalCommission;

      // Get state information
      const eventState = booking.events?.venues?.state || 'Unknown';
      const customerState = booking.customer_state || 'Unknown';

      const isEventWB = eventState === 'West Bengal';
      const isCustomerWB = customerState === 'West Bengal';

      // GST distribution based on state
      const commissionGSTWB = isEventWB ? commissionGST : 0;
      const commissionGSTOther = !isEventWB ? commissionGST : 0;
      const convenienceFeeGSTWB = isCustomerWB ? convenienceBreakdown.convenienceFeeGST : 0;
      const convenienceFeeGSTOther = !isCustomerWB ? convenienceBreakdown.convenienceFeeGST : 0;

      const totalGSTWB = commissionGSTWB + convenienceFeeGSTWB;
      const totalGSTOther = commissionGSTOther + convenienceFeeGSTOther;

      return {
        ...acc,
        totalSaleValue: acc.totalSaleValue + totalSaleValue,
        totalTicketPrice: acc.totalTicketPrice + totalBasePrice, // Total base price without convenience fee
        totalCommission: acc.totalCommission + totalCommission,
        totalCommissionBase: acc.totalCommissionBase + commissionBase,
        totalCommissionGST: acc.totalCommissionGST + commissionGST,
        totalCommissionGSTWB: acc.totalCommissionGSTWB + commissionGSTWB,
        totalCommissionGSTOther: acc.totalCommissionGSTOther + commissionGSTOther,
        totalReimbursableTicketPrice: acc.totalReimbursableTicketPrice + reimbursableTicketPrice,
        totalConvenienceFee: acc.totalConvenienceFee + convenienceBreakdown.convenienceFee,
        totalConvenienceFeeBase: acc.totalConvenienceFeeBase + convenienceBreakdown.convenienceFeeBase,
        totalConvenienceFeeGST: acc.totalConvenienceFeeGST + convenienceBreakdown.convenienceFeeGST,
        totalConvenienceFeeGSTWB: acc.totalConvenienceFeeGSTWB + convenienceFeeGSTWB,
        totalConvenienceFeeGSTOther: acc.totalConvenienceFeeGSTOther + convenienceFeeGSTOther,
        totalGSTWB: acc.totalGSTWB + totalGSTWB,
        totalGSTOther: acc.totalGSTOther + totalGSTOther,
        cgst: acc.cgst + (totalGSTWB / 2),
        sgst: acc.sgst + (totalGSTWB / 2),
        igst: acc.igst + totalGSTOther,
      };
    }, {
      state: '',
      totalSaleValue: 0,
      totalTicketPrice: 0,
      totalCommission: 0,
      totalCommissionBase: 0,
      totalCommissionGST: 0,
      totalCommissionGSTWB: 0,
      totalCommissionGSTOther: 0,
      totalReimbursableTicketPrice: 0,
      totalConvenienceFee: 0,
      totalConvenienceFeeBase: 0,
      totalConvenienceFeeGST: 0,
      totalConvenienceFeeGSTWB: 0,
      totalConvenienceFeeGSTOther: 0,
      totalGSTWB: 0,
      totalGSTOther: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
    });
  };

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      console.log('[DetailedFinancialReport] Fetching bookings data...');
      
      // Fetch bookings with events and venues data
      let query = supabase
        .from('bookings')
        .select(`
          *,
          events (
            id,
            name,
            venues (
              id,
              name,
              state
            )
          )
        `)
        .eq('status', 'Confirmed');

      if (dateRange.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      if (eventFilter && eventFilter !== 'all') {
        query = query.eq('event_id', eventFilter);
      }

      const { data: bookings, error: bookingsError } = await query;

      if (bookingsError) {
        console.error('[DetailedFinancialReport] Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      console.log('[DetailedFinancialReport] Found bookings:', bookings?.length || 0);

      if (!bookings || bookings.length === 0) {
        console.log('[DetailedFinancialReport] No bookings found');
        setAllEventsData([]);
        setGrandTotalData(null);
        setSelectedEventData(null);
        
        toast({
          title: "No Data",
          description: "No booking data found for the selected criteria",
          variant: "default",
        });
        return;
      }

      // Fetch event pricing data for all events in bookings
      const eventIds = [...new Set(bookings.map(booking => booking.event_id))];
      console.log('[DetailedFinancialReport] Fetching pricing data for events:', eventIds);
      
      const { data: pricingData, error: pricingError } = await supabase
        .from('event_seat_pricing')
        .select('event_id, base_price, convenience_fee, commission, convenience_fee_type, convenience_fee_value, commission_type, commission_value')
        .in('event_id', eventIds);

      if (pricingError) {
        console.error('[DetailedFinancialReport] Error fetching pricing data:', pricingError);
        throw pricingError;
      }

      console.log('[DetailedFinancialReport] Found pricing data:', pricingData?.length || 0);

      // Enrich bookings with pricing data
      const enrichedBookings = bookings.map(booking => {
        const pricing = pricingData?.find(p => p.event_id === booking.event_id);
        
        // Calculate base price - use booking's total_amount to derive base price
        // If seat_numbers exists and has pricing info, use it; otherwise fallback to pricing data
        let basePrice = 0;
        let convenienceFee = 0;
        let commission = 0;
        
        if (booking.seat_numbers && Array.isArray(booking.seat_numbers) && booking.seat_numbers.length > 0) {
          // For seat-based bookings, sum up all individual seat prices
          let totalSeatPrice = 0;
          for (const seat of booking.seat_numbers) {
            const seatPrice = Number((seat as any)?.price) || 0;
            totalSeatPrice += seatPrice;
          }
          basePrice = totalSeatPrice;
          
          // Calculate convenience fee and commission based on pricing data and total base price
          if (pricing) {
            if (pricing.convenience_fee_type === 'percentage') {
              convenienceFee = (basePrice * pricing.convenience_fee_value) / 100;
            } else {
              convenienceFee = Number(pricing.convenience_fee) || 0;
            }
            
            if (pricing.commission_type === 'percentage') {
              commission = (basePrice * pricing.commission_value) / 100;
            } else {
              commission = Number(pricing.commission) || 0;
            }
          }
        } else {
          // For general admission or fallback, use booking total_amount
          const totalAmount = Number((booking as any).total_amount) || 0;
          
          if (pricing) {
            // Calculate convenience fee based on pricing config
            if (pricing.convenience_fee_type === 'percentage') {
              // If percentage, we need to reverse calculate base price from total
              const convenienceFeeRate = pricing.convenience_fee_value / 100;
              basePrice = totalAmount / (1 + convenienceFeeRate);
              convenienceFee = totalAmount - basePrice;
            } else {
              // Fixed convenience fee
              convenienceFee = pricing.convenience_fee_value || 0;
              basePrice = totalAmount - convenienceFee;
            }
            
            // Calculate commission
            if (pricing.commission_type === 'percentage') {
              commission = (basePrice * pricing.commission_value) / 100;
            } else {
              commission = pricing.commission_value || 0;
            }
          } else {
            // No pricing data found, use stored booking values as fallback
            basePrice = Number((booking as any).base_price) || totalAmount;
            convenienceFee = Number((booking as any).convenience_fee) || 0;
            commission = Number((booking as any).commission) || 0;
          }
        }
        
        console.log(`[DetailedFinancialReport] Enriched booking ${booking.id}:`, {
          basePrice,
          convenienceFee,
          commission,
          totalAmount: (booking as any).total_amount,
          seatNumbers: booking.seat_numbers,
          pricing
        });
        
        return {
          ...booking,
          base_price: basePrice,
          convenience_fee: convenienceFee,
          commission: commission
        };
      });

      // Calculate state-wise metrics using venue state as fallback
      const stateGroups = enrichedBookings.reduce((acc, booking) => {
        const state = booking.events?.venues?.state || 'Unknown';
        if (!acc[state]) {
          acc[state] = [];
        }
        acc[state].push(booking);
        return acc;
      }, {} as Record<string, any[]>);

      const stateWiseData = Object.entries(stateGroups).map(([state, stateBookings]) => ({
        ...calculateFinancialMetrics(stateBookings),
        state
      }));

      setAllEventsData(stateWiseData);

      // Calculate grand total
      const grandTotal = calculateFinancialMetrics(enrichedBookings);
      grandTotal.state = 'Grand Total';
      setGrandTotalData(grandTotal);

      // Handle specific event selection
      if (eventFilter && eventFilter !== 'all') {
        const selectedEvent = events.find(e => e.id === eventFilter);
        
        if (selectedEvent && enrichedBookings.length > 0) {
          const eventMetrics = calculateFinancialMetrics(enrichedBookings);
          setSelectedEventData({
            ...eventMetrics,
            eventId: selectedEvent.id,
            eventName: selectedEvent.name,
            state: selectedEvent.name
          });
        } else {
          setSelectedEventData(null);
        }
      } else {
        setSelectedEventData(null);
      }

    } catch (error) {
      console.error('[DetailedFinancialReport] Error in fetchFinancialData:', error);
      toast({
        title: "Error",
        description: "Failed to fetch financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (preset: string) => {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    switch (preset) {
      case 'today':
        fromDate = new Date();
        toDate = new Date();
        break;
      case 'yesterday':
        const yesterday = subDays(new Date(), 1);
        fromDate = yesterday;
        toDate = yesterday;
        break;
      case 'this_month':
        fromDate = startOfMonth(new Date());
        toDate = endOfMonth(new Date());
        break;
      case 'last_month':
        const lastMonth = subDays(new Date(), 30);
        fromDate = startOfMonth(lastMonth);
        toDate = endOfMonth(lastMonth);
        break;
      case 'this_year':
        fromDate = startOfYear(new Date());
        toDate = endOfYear(new Date());
        break;
      case 'last_year':
        const lastYear = subDays(new Date(), 365);
        fromDate = startOfYear(lastYear);
        toDate = endOfYear(lastYear);
        break;
      default:
        fromDate = startOfMonth(new Date());
        toDate = endOfMonth(new Date());
        break;
    }

    setDateRange({ from: fromDate, to: toDate });
  };

  const exportToExcel = () => {
    if (!grandTotalData && allEventsData.length === 0) {
      toast({
        title: "No Data",
        description: "No financial data available to export.",
        variant: "destructive",
      });
      return;
    }

    const reportData = [];
    
    // Add header for all events table
    reportData.push([
      'State/Region',
      'Total Sale Value',
      'Total Ticket Price (excluding Convenience fee)',
      'Total Commission',
      'Total Commission Base',
      'Total Commission GST',
      'Total Commission GST in West Bengal',
      'Total Commission GST Other State',
      'Total Reimbursable Ticket Price',
      'Total Convenience Fee',
      'Total Convenience Fee Base',
      'Total Convenience Fee GST',
      'Total Convenience Fee GST West Bengal',
      'Total Convenience Fee GST Other State',
      'Total GST West Bengal',
      'Total GST Other State',
      'CGST',
      'SGST',
      'IGST'
    ]);

    // Add grand total row
    if (grandTotalData) {
      reportData.push([
        grandTotalData.state,
        grandTotalData.totalSaleValue.toFixed(2),
        grandTotalData.totalTicketPrice.toFixed(2),
        grandTotalData.totalCommission.toFixed(2),
        grandTotalData.totalCommissionBase.toFixed(2),
        grandTotalData.totalCommissionGST.toFixed(2),
        grandTotalData.totalCommissionGSTWB.toFixed(2),
        grandTotalData.totalCommissionGSTOther.toFixed(2),
        grandTotalData.totalReimbursableTicketPrice.toFixed(2),
        grandTotalData.totalConvenienceFee.toFixed(2),
        grandTotalData.totalConvenienceFeeBase.toFixed(2),
        grandTotalData.totalConvenienceFeeGST.toFixed(2),
        grandTotalData.totalConvenienceFeeGSTWB.toFixed(2),
        grandTotalData.totalConvenienceFeeGSTOther.toFixed(2),
        grandTotalData.totalGSTWB.toFixed(2),
        grandTotalData.totalGSTOther.toFixed(2),
        grandTotalData.cgst.toFixed(2),
        grandTotalData.sgst.toFixed(2),
        grandTotalData.igst.toFixed(2)
      ]);
    }

    // Add state-wise rows
    allEventsData.forEach(state => {
      reportData.push([
        state.state,
        state.totalSaleValue.toFixed(2),
        state.totalTicketPrice.toFixed(2),
        state.totalCommission.toFixed(2),
        state.totalCommissionBase.toFixed(2),
        state.totalCommissionGST.toFixed(2),
        state.totalCommissionGSTWB.toFixed(2),
        state.totalCommissionGSTOther.toFixed(2),
        state.totalReimbursableTicketPrice.toFixed(2),
        state.totalConvenienceFee.toFixed(2),
        state.totalConvenienceFeeBase.toFixed(2),
        state.totalConvenienceFeeGST.toFixed(2),
        state.totalConvenienceFeeGSTWB.toFixed(2),
        state.totalConvenienceFeeGSTOther.toFixed(2),
        state.totalGSTWB.toFixed(2),
        state.totalGSTOther.toFixed(2),
        state.cgst.toFixed(2),
        state.sgst.toFixed(2),
        state.igst.toFixed(2)
      ]);
    });

    // Add event-specific data if available
    if (selectedEventData) {
      reportData.push([]);
      reportData.push(['Event Specific Report']);
      reportData.push([
        'Event Name & ID',
        'Total Sale Value',
        'Total Ticket Price (excluding Convenience fee)',
        'Total Commission',
        'Total Commission Base',
        'Total Commission GST',
        'Total Commission GST in West Bengal',
        'Total Commission GST Other State',
        'Total Reimbursable Ticket Price',
        'Total Convenience Fee',
        'Total Convenience Fee Base',
        'Total Convenience Fee GST',
        'Total Convenience Fee GST West Bengal',
        'Total Convenience Fee GST Other State',
        'Total GST West Bengal',
        'Total GST Other State',
        'CGST',
        'SGST',
        'IGST'
      ]);
      
      reportData.push([
        `${selectedEventData.eventName} (${selectedEventData.eventId})`,
        selectedEventData.totalSaleValue.toFixed(2),
        selectedEventData.totalTicketPrice.toFixed(2),
        selectedEventData.totalCommission.toFixed(2),
        selectedEventData.totalCommissionBase.toFixed(2),
        selectedEventData.totalCommissionGST.toFixed(2),
        selectedEventData.totalCommissionGSTWB.toFixed(2),
        selectedEventData.totalCommissionGSTOther.toFixed(2),
        selectedEventData.totalReimbursableTicketPrice.toFixed(2),
        selectedEventData.totalConvenienceFee.toFixed(2),
        selectedEventData.totalConvenienceFeeBase.toFixed(2),
        selectedEventData.totalConvenienceFeeGST.toFixed(2),
        selectedEventData.totalConvenienceFeeGSTWB.toFixed(2),
        selectedEventData.totalConvenienceFeeGSTOther.toFixed(2),
        selectedEventData.totalGSTWB.toFixed(2),
        selectedEventData.totalGSTOther.toFixed(2),
        selectedEventData.cgst.toFixed(2),
        selectedEventData.sgst.toFixed(2),
        selectedEventData.igst.toFixed(2)
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comprehensive Financial Report");
    
    const fileName = `Comprehensive_Financial_Report_${dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : 'from'}_to_${dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : 'to'}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Success",
      description: "Comprehensive financial report exported successfully!",
    });
  };

  const renderFinancialTable = (data: StateFinancialData[], title: string, showGrandTotal: boolean = false) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3 sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 min-w-[150px]">
                State/Region
              </th>
              <th scope="col" className="px-6 py-3 min-w-[120px]">Total Sale Value</th>
              <th scope="col" className="px-6 py-3 min-w-[140px]">Total Ticket Price</th>
              <th scope="col" className="px-6 py-3 min-w-[120px]">Total Commission</th>
              <th scope="col" className="px-6 py-3 min-w-[140px]">Total Commission Base</th>
              <th scope="col" className="px-6 py-3 min-w-[140px]">Total Commission GST</th>
              <th scope="col" className="px-6 py-3 min-w-[160px]">Commission GST WB</th>
              <th scope="col" className="px-6 py-3 min-w-[160px]">Commission GST Other</th>
              <th scope="col" className="px-6 py-3 min-w-[160px]">Reimbursable Ticket Price</th>
              <th scope="col" className="px-6 py-3 min-w-[140px]">Total Convenience Fee</th>
              <th scope="col" className="px-6 py-3 min-w-[160px]">Convenience Fee Base</th>
              <th scope="col" className="px-6 py-3 min-w-[160px]">Convenience Fee GST</th>
              <th scope="col" className="px-6 py-3 min-w-[180px]">Convenience GST WB</th>
              <th scope="col" className="px-6 py-3 min-w-[180px]">Convenience GST Other</th>
              <th scope="col" className="px-6 py-3 min-w-[140px]">Total GST WB</th>
              <th scope="col" className="px-6 py-3 min-w-[140px]">Total GST Other</th>
              <th scope="col" className="px-6 py-3 min-w-[100px]">CGST</th>
              <th scope="col" className="px-6 py-3 min-w-[100px]">SGST</th>
              <th scope="col" className="px-6 py-3 min-w-[100px]">IGST</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={19} className="px-6 py-4 text-center">
                  Loading financial data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={19} className="px-6 py-4 text-center">
                  No financial data available for the selected period.
                </td>
              </tr>
            ) : (
              <>
                {showGrandTotal && grandTotalData && (
                  <tr className="bg-blue-50 border-b dark:bg-blue-900 dark:border-gray-700 font-semibold">
                    <td className="px-6 py-4 sticky left-0 z-10 bg-blue-50 dark:bg-blue-900 font-bold">
                      {grandTotalData.state}
                    </td>
                    <td className="px-6 py-4">₹{grandTotalData.totalSaleValue.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalTicketPrice.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalCommission.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalCommissionBase.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalCommissionGST.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalCommissionGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalCommissionGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalReimbursableTicketPrice.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalConvenienceFee.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalConvenienceFeeBase.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalConvenienceFeeGST.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalConvenienceFeeGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalConvenienceFeeGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.totalGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.cgst.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.sgst.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{grandTotalData.igst.toFixed(2)}</td>
                  </tr>
                )}
                
                {data.map((item, index) => (
                  <tr
                    key={index}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="px-6 py-4 sticky left-0 z-10 bg-white dark:bg-gray-800 font-medium">
                      {item.state}
                    </td>
                    <td className="px-6 py-4">₹{item.totalSaleValue.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalTicketPrice.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalCommission.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalCommissionBase.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalCommissionGST.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalCommissionGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalCommissionGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalReimbursableTicketPrice.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalConvenienceFee.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalConvenienceFeeBase.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalConvenienceFeeGST.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalConvenienceFeeGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalConvenienceFeeGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.totalGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.cgst.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.sgst.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{item.igst.toFixed(2)}</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprehensive Financial Report</CardTitle>
        <p className="text-sm text-gray-500">
          Detailed financial metrics with GST calculations and state-wise breakdown.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Picker */}
        <div className="flex items-center justify-between">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, "MMM dd, yyyy")} - ${format(
                      dateRange.to,
                      "MMM dd, yyyy"
                    )}`
                  ) : (
                    format(dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Preset Date Select */}
          <Select onValueChange={handlePresetSelect}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Event Filter */}
        <div className="flex items-center space-x-4">
          <Select onValueChange={setEventFilter} value={eventFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by Event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Debug Info */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p><strong>Debug Info:</strong></p>
          <p>• Events loaded: {events.length}</p>
          <p>• Date range: {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Not set'} to {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Not set'}</p>
          <p>• Event filter: {eventFilter}</p>
          <p>• States with data: {allEventsData.length}</p>
          <p>• Loading: {loading ? 'Yes' : 'No'}</p>
          <p>• Convenience Fee Calculation: 2% of ticket price, Base = 84.745% of fee, GST = Fee - Base</p>
        </div>

        {/* All Events Financial Table */}
        {renderFinancialTable(allEventsData, "For All Events", true)}

        {/* Event-Specific Financial Table */}
        {selectedEventData && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Event Specific Report: {selectedEventData.eventName}</h3>
            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3 sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 min-w-[200px]">
                      Event Name & ID
                    </th>
                    <th scope="col" className="px-6 py-3 min-w-[120px]">Total Sale Value</th>
                    <th scope="col" className="px-6 py-3 min-w-[140px]">Total Ticket Price</th>
                    <th scope="col" className="px-6 py-3 min-w-[120px]">Total Commission</th>
                    <th scope="col" className="px-6 py-3 min-w-[140px]">Total Commission Base</th>
                    <th scope="col" className="px-6 py-3 min-w-[140px]">Total Commission GST</th>
                    <th scope="col" className="px-6 py-3 min-w-[160px]">Commission GST WB</th>
                    <th scope="col" className="px-6 py-3 min-w-[160px]">Commission GST Other</th>
                    <th scope="col" className="px-6 py-3 min-w-[160px]">Reimbursable Ticket Price</th>
                    <th scope="col" className="px-6 py-3 min-w-[140px]">Total Convenience Fee</th>
                    <th scope="col" className="px-6 py-3 min-w-[160px]">Convenience Fee Base</th>
                    <th scope="col" className="px-6 py-3 min-w-[160px]">Convenience Fee GST</th>
                    <th scope="col" className="px-6 py-3 min-w-[180px]">Convenience GST WB</th>
                    <th scope="col" className="px-6 py-3 min-w-[180px]">Convenience GST Other</th>
                    <th scope="col" className="px-6 py-3 min-w-[140px]">Total GST WB</th>
                    <th scope="col" className="px-6 py-3 min-w-[140px]">Total GST Other</th>
                    <th scope="col" className="px-6 py-3 min-w-[100px]">CGST</th>
                    <th scope="col" className="px-6 py-3 min-w-[100px]">SGST</th>
                    <th scope="col" className="px-6 py-3 min-w-[100px]">IGST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-green-50 border-b dark:bg-green-900 dark:border-gray-700 font-semibold">
                    <td className="px-6 py-4 sticky left-0 z-10 bg-green-50 dark:bg-green-900 font-bold">
                      {selectedEventData.eventName} ({selectedEventData.eventId})
                    </td>
                    <td className="px-6 py-4">₹{selectedEventData.totalSaleValue.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalTicketPrice.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalCommission.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalCommissionBase.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalCommissionGST.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalCommissionGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalCommissionGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalReimbursableTicketPrice.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalConvenienceFee.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalConvenienceFeeBase.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalConvenienceFeeGST.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalConvenienceFeeGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalConvenienceFeeGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalGSTWB.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.totalGSTOther.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.cgst.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.sgst.toFixed(2)}</td>
                    <td className="px-6 py-4">₹{selectedEventData.igst.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export Button */}
        <Button onClick={exportToExcel} disabled={loading || (!grandTotalData && allEventsData.length === 0)}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </CardContent>
    </Card>
  );
};

export default DetailedFinancialReport;
