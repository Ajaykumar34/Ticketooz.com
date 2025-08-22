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

interface IndividualBookingMetrics {
  bookingId: string;
  customerState: string;
  eventName: string;
  ticketCount: number;
  totalSaleValue: number;
  totalTicketPrice: number; // A
  totalConvenienceFee: number; // B
  convenienceFeeBase: number; // C = 84.745% of B
  convenienceFeeGST: number; // D = B - C
  totalCommission: number; // F
  commissionBase: number; // G = 84.745% of F
  commissionGST: number; // H = F - G
  reimbursableTicketPrice: number; // K = A - F
  totalGSTWB: number;
  totalGSTOther: number;
  cgst: number;
  sgst: number;
  igst: number;
  bookingDate: string;
}

interface BookingData {
  id: string;
  event_id: string;
  quantity: number;
  total_price: number;
  convenience_fee: number;
  customer_state?: string;
  created_at: string;
  events: {
    id: string;
    name: string;
    start_datetime: string;
    venues: {
      id: string;
      name: string;
      state: string;
    } | null;
    event_seat_pricing: {
      id: string;
      base_price: number;
      convenience_fee: number;
      commission: number;
      convenience_fee_type?: string;
      convenience_fee_value?: number;
      commission_type?: string;
      commission_value?: number;
      is_active: boolean;
    }[] | null;
  } | null;
}

const ComprehensiveFinancialReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportName, setReportName] = useState('');
  const [loading, setLoading] = useState(false);
  const [individualBookingsData, setIndividualBookingsData] = useState<IndividualBookingMetrics[]>([]);
  const [totalData, setTotalData] = useState<Omit<IndividualBookingMetrics, 'bookingId' | 'customerState' | 'eventName' | 'bookingDate'> | null>(null);

  const calculateGSTBreakdown = (customerState: string, gstAmount: number) => {
    const isWBCustomer = customerState === 'West Bengal';
    
    if (isWBCustomer) {
      // West Bengal customer: CGST + SGST (intra-state scenario)
      return {
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        igst: 0,
        gstWB: gstAmount,
        gstOther: 0
      };
    } else {
      // Non-West Bengal customer: IGST (inter-state scenario)
      return {
        cgst: 0,
        sgst: 0,
        igst: gstAmount,
        gstWB: 0,
        gstOther: gstAmount
      };
    }
  };

  const processIndividualBookings = (bookings: BookingData[]): IndividualBookingMetrics[] => {
    console.log("Processing individual booking data with", bookings.length, "bookings");
    
    return bookings.map((booking) => {
      const customerState = booking.customer_state || 'Unknown';
      const eventName = booking.events?.name || 'Unknown Event';
      
      console.log(`Processing individual booking ${booking.id} for ${customerState} customer, event: ${eventName}`);
      
      // Get actual values from booking data  
      const quantity = Number(booking.quantity) || 1;
      const totalPrice = Number(booking.total_price) || 0;
      const convenienceFee = Number(booking.convenience_fee) || 0;
      
      // A: Total Ticket Price = total price - convenience fee
      const totalTicketPrice = totalPrice - convenienceFee;
      
      // B: Total Convenience Fee
      const totalConvenienceFee = convenienceFee;
      
      // C: Convenience Fee Base = 84.745% of Total Convenience Fee
      const convenienceFeeBase = totalConvenienceFee * 0.84745;
      
      // D: Convenience Fee GST = B - C
      const convenienceFeeGST = totalConvenienceFee - convenienceFeeBase;
      
      // F: Commission - Get from event seat pricing or use database calculation
      let totalCommission = 0;
      
      // Try to get actual commission from event seat pricing
      const eventPricing = booking.events?.event_seat_pricing?.find(pricing => pricing.is_active);
      if (eventPricing && eventPricing.commission > 0) {
        // Use the actual commission value from database (this should be the correct calculated amount)
        console.log(`Using actual commission from database: ${eventPricing.commission} for ${quantity} tickets`);
        totalCommission = eventPricing.commission * quantity;
      } else {
        // Fallback: calculate commission based on type and value if available
        if (eventPricing && eventPricing.commission_type && eventPricing.commission_value) {
          if (eventPricing.commission_type === 'percentage') {
            totalCommission = (totalTicketPrice / quantity) * (eventPricing.commission_value / 100) * quantity;
          } else {
            totalCommission = eventPricing.commission_value * quantity;
          }
          console.log(`Calculated commission using ${eventPricing.commission_type}: ${eventPricing.commission_value}, result: ${totalCommission}`);
        } else {
          // Default fallback (10% of ticket price)
          totalCommission = totalTicketPrice * 0.10;
          console.log(`Using default 10% commission: ${totalCommission}`);
        }
      }
      
      // G: Commission Base = 84.745% of Commission
      const commissionBase = totalCommission * 0.84745;
      
      // H: Commission GST = F - G
      const commissionGST = totalCommission - commissionBase;
      
      // K: Reimbursable Ticket Price = A - F
      const reimbursablePrice = totalTicketPrice - totalCommission;
      
      console.log(`Individual booking ${booking.id}: commission calculation - pricing commission: ${eventPricing?.commission}, calculated total: ${totalCommission}`);
      
      // Calculate GST breakdowns based on customer state
      const commissionGSTBreakdown = calculateGSTBreakdown(customerState, commissionGST);
      const convenienceGSTBreakdown = calculateGSTBreakdown(customerState, convenienceFeeGST);
      
      return {
        bookingId: booking.id,
        customerState,
        eventName,
        ticketCount: quantity,
        totalSaleValue: totalPrice, // Total sale value for this booking
        totalTicketPrice, // A
        totalConvenienceFee, // B
        convenienceFeeBase, // C
        convenienceFeeGST, // D
        totalCommission, // F
        commissionBase, // G
        commissionGST, // H
        reimbursableTicketPrice: reimbursablePrice, // K
        totalGSTWB: commissionGSTBreakdown.gstWB + convenienceGSTBreakdown.gstWB,
        totalGSTOther: commissionGSTBreakdown.gstOther + convenienceGSTBreakdown.gstOther,
        cgst: commissionGSTBreakdown.cgst + convenienceGSTBreakdown.cgst,
        sgst: commissionGSTBreakdown.sgst + convenienceGSTBreakdown.sgst,
        igst: commissionGSTBreakdown.igst + convenienceGSTBreakdown.igst,
        bookingDate: new Date(booking.created_at).toLocaleDateString()
      };
    });
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    
    try {
      console.log("Fetching individual booking data from", startDate, "to", endDate);
      
      // Query actual bookings with proper joins to get exact booked ticket values and event pricing
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id,
          event_id,
          quantity,
          total_price,
          convenience_fee,
          customer_state,
          created_at,
          events(
            id,
            name,
            start_datetime,
            venues(
              id,
              name,
              state
            ),
            event_seat_pricing(
              id,
              base_price,
              convenience_fee,
              commission,
              convenience_fee_type,
              convenience_fee_value,
              commission_type,
              commission_value,
              is_active
            )
          )
        `)
        .gte("created_at", startDate + 'T00:00:00')
        .lte("created_at", endDate + 'T23:59:59')
        .eq("status", "Confirmed");

      if (error) {
        console.error("Error fetching booking data:", error);
        toast.error(`Error fetching data: ${error.message}`);
        return;
      }

      if (!bookings?.length) {
        toast.error('No booking data found for the selected date range.');
        setIndividualBookingsData([]);
        setTotalData(null);
        return;
      }

      console.log("Raw booking data fetched:", bookings.length);
      
      // Process the bookings to ensure all required fields are available
      const processedBookings: BookingData[] = bookings.map(b => ({
        id: b.id,
        event_id: b.event_id,
        quantity: b.quantity,
        total_price: b.total_price,
        convenience_fee: b.convenience_fee,
        customer_state: b.customer_state,
        created_at: b.created_at,
        events: b.events
      }));

      console.log("Processed bookings sample:", processedBookings[0]);

      const individualBookings = processIndividualBookings(processedBookings);
      console.log("Individual bookings processed data:", individualBookings);
      
      setIndividualBookingsData(individualBookings);

      // Calculate totals across all individual bookings
      const totals = individualBookings.reduce((acc, booking) => {
        acc.ticketCount += booking.ticketCount;
        acc.totalSaleValue += booking.totalSaleValue;
        acc.totalTicketPrice += booking.totalTicketPrice;
        acc.totalConvenienceFee += booking.totalConvenienceFee;
        acc.convenienceFeeBase += booking.convenienceFeeBase;
        acc.convenienceFeeGST += booking.convenienceFeeGST;
        acc.totalCommission += booking.totalCommission;
        acc.commissionBase += booking.commissionBase;
        acc.commissionGST += booking.commissionGST;
        acc.reimbursableTicketPrice += booking.reimbursableTicketPrice;
        acc.totalGSTWB += booking.totalGSTWB;
        acc.totalGSTOther += booking.totalGSTOther;
        acc.cgst += booking.cgst;
        acc.sgst += booking.sgst;
        acc.igst += booking.igst;
        return acc;
      }, {
        ticketCount: 0,
        totalSaleValue: 0,
        totalTicketPrice: 0, // A
        totalConvenienceFee: 0, // B
        convenienceFeeBase: 0, // C
        convenienceFeeGST: 0, // D
        totalCommission: 0, // F
        commissionBase: 0, // G
        commissionGST: 0, // H
        reimbursableTicketPrice: 0, // K
        totalGSTWB: 0,
        totalGSTOther: 0,
        cgst: 0,
        sgst: 0,
        igst: 0
      });

      console.log("Final totals calculated:", totals);
      setTotalData(totals);
      toast.success('Individual bookings financial report generated successfully');
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    if (individualBookingsData.length === 0) {
      toast.error('No report data to save');
      return;
    }

    try {
      const reportData = {
        individualBookingsData,
        totalData,
        generatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('financial_reports')
        .insert({
          report_name: reportName.trim(),
          report_type: 'individual_customer_bookings',
          date_range_start: startDate + 'T00:00:00Z',
          date_range_end: endDate + 'T23:59:59Z',
          report_data: reportData as any,
          filters_applied: {
            reportType: 'individual_customer_bookings'
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

  const exportToExcel = () => {
    if (individualBookingsData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = [
      ['Individual Customer Bookings Financial Report'],
      ['Date Range:', `${startDate} to ${endDate}`],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Note: Each row represents a separate booking by customer state'],
      ['Note: Shows individual bookings like "12 tickets in Rajasthan for Test 1", "4 tickets in Kerala for Test 2"'],
      ['Formula Reference:'],
      ['A = Ticket Price (from actual bookings)'],
      ['B = Convenience Fee (from actual bookings)'],
      ['C = Convenience Fee Base (84.745% of B)'],
      ['D = Convenience Fee GST (B - C)'],
      ['F = Commission (calculated from ticket price)'],
      ['G = Commission Base (84.745% of F)'],
      ['H = Commission GST (F - G)'],
      ['K = Reimbursable Ticket Price (A - F)'],
      ['Total Sale Value = A + B (Ticket Price + Convenience Fee)'],
      [''],
      [
        'Booking ID',
        'Customer State',
        'Event Name',
        'Ticket Count',
        'Total Sale Value (A+B)',
        'Ticket Price (A)',
        'Convenience Fee (B)',
        'Conv Fee Base (C)',
        'Conv Fee GST (D)',
        'Commission (F)',
        'Commission Base (G)',
        'Commission GST (H)',
        'Reimbursable Price (K)',
        'Total GST WB',
        'Total GST Other',
        'CGST',
        'SGST',
        'IGST',
        'Booking Date'
      ],
      ...individualBookingsData.map(booking => [
        booking.bookingId,
        booking.customerState,
        booking.eventName,
        booking.ticketCount,
        booking.totalSaleValue.toFixed(2),
        booking.totalTicketPrice.toFixed(2), // A
        booking.totalConvenienceFee.toFixed(2), // B
        booking.convenienceFeeBase.toFixed(2), // C
        booking.convenienceFeeGST.toFixed(2), // D
        booking.totalCommission.toFixed(2), // F
        booking.commissionBase.toFixed(2), // G
        booking.commissionGST.toFixed(2), // H
        booking.reimbursableTicketPrice.toFixed(2), // K
        booking.totalGSTWB.toFixed(2),
        booking.totalGSTOther.toFixed(2),
        booking.cgst.toFixed(2),
        booking.sgst.toFixed(2),
        booking.igst.toFixed(2),
        booking.bookingDate
      ])
    ];

    if (totalData) {
      exportData.push([
        'TOTAL',
        'ALL STATES',
        'ALL EVENTS',
        totalData.ticketCount,
        totalData.totalSaleValue.toFixed(2),
        totalData.totalTicketPrice.toFixed(2), // A
        totalData.totalConvenienceFee.toFixed(2), // B
        totalData.convenienceFeeBase.toFixed(2), // C
        totalData.convenienceFeeGST.toFixed(2), // D
        totalData.totalCommission.toFixed(2), // F
        totalData.commissionBase.toFixed(2), // G
        totalData.commissionGST.toFixed(2), // H
        totalData.reimbursableTicketPrice.toFixed(2), // K
        totalData.totalGSTWB.toFixed(2),
        totalData.totalGSTOther.toFixed(2),
        totalData.cgst.toFixed(2),
        totalData.sgst.toFixed(2),
        totalData.igst.toFixed(2),
        'All Dates'
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws, 'Individual Bookings Report');

    const fileName = `Individual_Customer_Bookings_Report_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Report exported successfully');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Individual Customer Bookings Financial Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
          </div>
          
          <div className="flex gap-4 mb-4">
            <Button onClick={generateReport} disabled={loading}>
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            
            {individualBookingsData.length > 0 && (
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
          
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p><strong>📊 Individual Customer Bookings Report:</strong></p>
            <p>• Each row shows a separate booking by customer state and event</p>
            <p>• Your Rajasthan bookings will show as individual entries like "16 tickets for test 4", "2 tickets for test 1", etc.</p>
            <p>• Your Punjab bookings will show separately as individual entries</p>
            <p>• Perfect for tracking individual customer transactions and detailed booking analysis</p>
          </div>
        </CardContent>
      </Card>

      {individualBookingsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Customer Bookings Financial Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Booking ID</TableHead>
                    <TableHead className="min-w-[120px]">Customer State</TableHead>
                    <TableHead className="min-w-[150px]">Event Name</TableHead>
                    <TableHead className="text-right min-w-[80px]">Tickets</TableHead>
                    <TableHead className="text-right min-w-[120px]">Total Sale Value (A+B)</TableHead>
                    <TableHead className="text-right min-w-[100px]">Ticket Price (A)</TableHead>
                    <TableHead className="text-right min-w-[120px]">Convenience Fee (B)</TableHead>
                    <TableHead className="text-right min-w-[120px]">Conv Fee Base (C)</TableHead>
                    <TableHead className="text-right min-w-[120px]">Conv Fee GST (D)</TableHead>
                    <TableHead className="text-right min-w-[100px]">Commission (F)</TableHead>
                    <TableHead className="text-right min-w-[120px]">Commission Base (G)</TableHead>
                    <TableHead className="text-right min-w-[120px]">Commission GST (H)</TableHead>
                    <TableHead className="text-right min-w-[140px]">Reimbursable Price (K)</TableHead>
                    <TableHead className="text-right min-w-[100px]">Total GST WB</TableHead>
                    <TableHead className="text-right min-w-[100px]">Total GST Other</TableHead>
                    <TableHead className="text-right min-w-[80px]">CGST</TableHead>
                    <TableHead className="text-right min-w-[80px]">SGST</TableHead>
                    <TableHead className="text-right min-w-[80px]">IGST</TableHead>
                    <TableHead className="min-w-[100px]">Booking Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {individualBookingsData.map((booking, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{booking.bookingId.slice(0, 8)}...</TableCell>
                      <TableCell className="font-medium bg-blue-50">{booking.customerState}</TableCell>
                      <TableCell className="font-medium bg-green-50">{booking.eventName}</TableCell>
                      <TableCell className="text-right font-medium">{booking.ticketCount}</TableCell>
                      <TableCell className="text-right font-bold bg-blue-50">₹{booking.totalSaleValue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.totalTicketPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.totalConvenienceFee.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.convenienceFeeBase.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.convenienceFeeGST.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.totalCommission.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.commissionBase.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.commissionGST.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.reimbursableTicketPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.totalGSTWB.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.totalGSTOther.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.cgst.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.sgst.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{booking.igst.toLocaleString()}</TableCell>
                      <TableCell>{booking.bookingDate}</TableCell>
                    </TableRow>
                  ))}
                  {totalData && (
                    <TableRow className="border-t-2 border-primary font-bold bg-muted/50">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="font-bold">ALL STATES</TableCell>
                      <TableCell className="font-bold">ALL EVENTS</TableCell>
                      <TableCell className="text-right font-bold">{totalData.ticketCount}</TableCell>
                      <TableCell className="text-right font-bold bg-blue-100">₹{totalData.totalSaleValue.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.totalTicketPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.totalConvenienceFee.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.convenienceFeeBase.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.convenienceFeeGST.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.totalCommission.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.commissionBase.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.commissionGST.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.reimbursableTicketPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.totalGSTWB.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.totalGSTOther.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.cgst.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.sgst.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">₹{totalData.igst.toLocaleString()}</TableCell>
                      <TableCell className="font-bold">All Dates</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComprehensiveFinancialReport;
