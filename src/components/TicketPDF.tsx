import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoiceNumber } from '@/utils/invoiceUtils';

interface TicketData {
  booking: {
    id: string;
    quantity: number;
    total_price: number;
    booking_date: string;
    convenience_fee?: number;
    event_occurrence_id?: string;
    occurrence_ticket_category_id?: string;
    seat_numbers?: Array<{
      price: number;
      seat_number: string;
      seat_category: string;
    }> | null;
  };
  event: {
    name: string;
    start_datetime: string;
    venue?: {
      name: string;
      city: string;
      address: string;
    } | null;
    category?: string;
    sub_category?: string;
    genre?: string;
    genres?: string[];
    language?: string;
    duration?: number;
    tags?: string[];
    artist_name?: string;
    artists?: Array<{
      name: string;
      image?: string;
    }>;
    is_recurring?: boolean;
    event_time?: string;
  };
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  selectedSeats?: any[];
  totalPrice: number;
  basePrice: number;
  convenienceFee: number;
  formattedBookingId?: string;
  selectedGeneralTickets?: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    basePrice: number;
    convenienceFee: number;
    totalPrice: number;
  }>;
  eventOccurrenceId?: string;
}

interface BackendPricing {
  basePrice: number;
  convenienceFee: number;
  gstAmount: number;
  totalPrice: number;
  actualTotalQuantity?: number;
  categoryBreakdown?: Array<{
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  customerData?: {
    name: string;
    email: string;
    phone: string;
  };
  occurrenceData?: {
    occurrence_date: string;
    occurrence_time: string;
  };
  eventTime?: string;
}

// Enhanced pricing data fetch for recurring events with occurrence-specific data
const fetchPricingData = async (bookingId: string): Promise<BackendPricing | null> => {
  try {
    console.log('Fetching pricing data for booking:', bookingId);
    
    // Get booking with detailed information including occurrence data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        seat_numbers,
        total_price,
        convenience_fee,
        customer_name,
        customer_email,
        customer_phone,
        event_occurrence_id,
        occurrence_ticket_category_id,
        event:events!inner(
          id,
          name,
          category,
          is_recurring,
          event_time
        ),
        event_occurrences!left(
          id,
          occurrence_date,
          occurrence_time
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      return null;
    }

    if (!booking) {
      console.error('No booking found for ID:', bookingId);
      return null;
    }

    console.log('Fetched booking data for PDF pricing:', booking);

    let basePrice = 0;
    let convenienceFeeFromDB = booking.convenience_fee || 0;
    let totalPrice = booking.total_price || 0;
    let actualTotalQuantity = 0;
    const categoryBreakdown: Array<{
      category: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    // Get occurrence-specific data for recurring events
    let occurrenceData = null;
    if (booking.event_occurrence_id && booking.event_occurrences) {
      occurrenceData = {
        occurrence_date: booking.event_occurrences.occurrence_date,
        occurrence_time: booking.event_occurrences.occurrence_time
      };
      console.log('Found occurrence data for PDF:', occurrenceData);
    }

    // Enhanced handling for recurring events with occurrence data
    if (booking.event_occurrence_id && booking.occurrence_ticket_category_id) {
      console.log('Processing recurring event booking with occurrence ID:', booking.event_occurrence_id);
      
      // Get occurrence ticket category data
      const { data: occurrenceCategory, error: categoryError } = await supabase
        .from('occurrence_ticket_categories')
        .select('*')
        .eq('id', booking.occurrence_ticket_category_id)
        .single();

      if (!categoryError && occurrenceCategory) {
        console.log('Found occurrence category data:', occurrenceCategory);
        
        const categoryName = occurrenceCategory.category_name;
        const categoryBasePrice = occurrenceCategory.base_price;
        const categoryQuantity = booking.quantity;
        
        categoryBreakdown.push({
          category: categoryName,
          quantity: categoryQuantity,
          unitPrice: categoryBasePrice,
          totalPrice: categoryBasePrice * categoryQuantity
        });
        
        basePrice = categoryBasePrice * categoryQuantity;
        actualTotalQuantity = categoryQuantity;
      }
    }

    // Fallback: Handle seat_numbers data with proper category breakdown
    if (categoryBreakdown.length === 0 && booking.seat_numbers && Array.isArray(booking.seat_numbers)) {
      console.log('Processing seat_numbers data for category breakdown');
      
      const categoryCountMap = new Map<string, { quantity: number; totalPrice: number; unitPrice: number }>();
      let totalQuantityFromSeats = 0;
      
      booking.seat_numbers.forEach((seat: any) => {
        const category = seat.seat_category || seat.category || 'General';
        const price = seat.price || seat.base_price || 0;
        let quantity = 1;
        if (seat.quantity) {
          quantity = typeof seat.quantity === 'string' ? parseInt(seat.quantity, 10) : seat.quantity;
        } else if (seat.booked_quantity) {
          quantity = typeof seat.booked_quantity === 'string' ? parseInt(seat.booked_quantity, 10) : seat.booked_quantity;
        }
        
        totalQuantityFromSeats += quantity;
        
        console.log(`Processing seat entry:`, { category, price, quantity, seat });
        
        if (!categoryCountMap.has(category)) {
          categoryCountMap.set(category, { quantity: 0, totalPrice: 0, unitPrice: price });
        }
        
        const current = categoryCountMap.get(category)!;
        current.quantity += quantity;
        current.totalPrice += price * quantity;
        basePrice += price * quantity;
      });

      actualTotalQuantity = totalQuantityFromSeats;

      categoryCountMap.forEach((data, category) => {
        categoryBreakdown.push({
          category,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalPrice: data.totalPrice
        });
      });
    }

    // Final fallback calculation
    if (basePrice === 0) {
      basePrice = totalPrice - convenienceFeeFromDB;
      actualTotalQuantity = booking.quantity;
      
      if (categoryBreakdown.length === 0) {
        categoryBreakdown.push({
          category: 'General Admission',
          quantity: booking.quantity,
          unitPrice: basePrice / booking.quantity,
          totalPrice: basePrice
        });
      }
    }

    // Calculate convenience fee breakdown (base fee + GST)
    const convenienceFeeBeforeGst = convenienceFeeFromDB > 0 ? convenienceFeeFromDB / 1.18 : 0;
    const gstAmount = convenienceFeeFromDB > 0 ? convenienceFeeFromDB - convenienceFeeBeforeGst : 0;

    console.log('Final calculated pricing for PDF:', {
      basePrice,
      convenienceFee: convenienceFeeBeforeGst,
      gstAmount,
      totalPrice,
      categoryBreakdown,
      actualTotalQuantity,
      occurrenceData
    });

    return {
      basePrice,
      convenienceFee: convenienceFeeBeforeGst,
      gstAmount,
      totalPrice,
      categoryBreakdown,
      actualTotalQuantity,
      customerData: {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone
      },
      occurrenceData,
      eventTime: booking.event?.event_time // Add event_time from event table
    };
  } catch (error) {
    console.error('Error in fetchPricingData:', error);
    return null;
  }
};

// Compact single-page configuration
const getSinglePageConfig = (pageWidth: number, pageHeight: number) => {
  return {
    margin: 10,
    headerHeight: 25,
    fontSize: {
      title: 16,
      subtitle: 10,
      heading: 12,
      body: 9,
      small: 8
    },
    lineHeight: 4,
    sectionSpacing: 8,
    qrSize: 40,
    contentPadding: 3,
    maxTextWidth: pageWidth * 0.85
  };
};

// Helper function to add text with word wrapping but no page breaks
const addCompactText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, fontSize: number) => {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = y;
  
  (Array.isArray(lines) ? lines : [lines]).forEach((line: string) => {
    doc.text(line, x, currentY);
    currentY += 4; // Fixed compact line height
  });
  
  return currentY;
};

// Compact ticket breakdown for single page
const displayCompactTicketBreakdown = (doc: jsPDF, ticketData: TicketData, backendPricing: BackendPricing | null, rightColumnX: number, rightColumnWidth: number, currentY: number) => {
  const isGeneralAdmission = !ticketData.selectedSeats || ticketData.selectedSeats.length === 0;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Tickets', rightColumnX, currentY);
  
  currentY += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  if (isGeneralAdmission) {
    doc.text('Type:', rightColumnX, currentY);
    currentY += 5;
    
    const categoryParts: string[] = [];
    
    if (ticketData.event.is_recurring && backendPricing && backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0) {
      backendPricing.categoryBreakdown.forEach((category) => {
        categoryParts.push(`${category.category} × ${category.quantity}`);
      });
    } else if (ticketData.selectedGeneralTickets && ticketData.selectedGeneralTickets.length > 0) {
      ticketData.selectedGeneralTickets.forEach((ticket) => {
        categoryParts.push(`${ticket.categoryName} × ${ticket.quantity}`);
      });
    } else if (ticketData.booking.seat_numbers && Array.isArray(ticketData.booking.seat_numbers)) {
      const categoryMap = new Map<string, number>();
      ticketData.booking.seat_numbers.forEach((seat: any) => {
        const category = seat.seat_category || seat.category || 'General';
        let quantity = 1;
        if (seat.quantity) {
          quantity = typeof seat.quantity === 'string' ? parseInt(seat.quantity, 10) : seat.quantity;
        } else if (seat.booked_quantity) {
          quantity = typeof seat.booked_quantity === 'string' ? parseInt(seat.booked_quantity, 10) : seat.booked_quantity;
        }
        categoryMap.set(category, (categoryMap.get(category) || 0) + quantity);
      });
      categoryMap.forEach((quantity, category) => {
        categoryParts.push(`${category} × ${quantity}`);
      });
    } else {
      categoryParts.push(`General × ${ticketData.booking.quantity}`);
    }
    
    const ticketSummary = categoryParts.join(', ');
    currentY = addCompactText(doc, ticketSummary, rightColumnX, currentY, rightColumnWidth, 9);
    currentY += 5;
    
  } else {
    const seatsByCategory = new Map<string, string[]>();
    
    if (ticketData.selectedSeats && ticketData.selectedSeats.length > 0) {
      ticketData.selectedSeats.forEach(seat => {
        const category = seat.seat_categories?.name || seat.category_name || seat.category || 'General';
        const seatNumber = `${seat.row_name || ''}${seat.seat_number}`;
        
        if (!seatsByCategory.has(category)) {
          seatsByCategory.set(category, []);
        }
        seatsByCategory.get(category)!.push(seatNumber);
      });
    } else if (ticketData.booking.seat_numbers) {
      ticketData.booking.seat_numbers.forEach(seat => {
        const category = seat.seat_category || 'General';
        if (!seatsByCategory.has(category)) {
          seatsByCategory.set(category, []);
        }
        seatsByCategory.get(category)!.push(seat.seat_number);
      });
    }
    
    const categoryParts: string[] = [];
    seatsByCategory.forEach((seats, category) => {
      categoryParts.push(`${category}: ${seats.join(', ')}`);
    });
    
    const seatsDisplayText = categoryParts.join(' ');
    currentY = addCompactText(doc, seatsDisplayText, rightColumnX, currentY, rightColumnWidth, 9);
  }
  
  currentY += 8;
  
  let totalSeats = ticketData.booking.quantity;
  if (backendPricing && backendPricing.actualTotalQuantity) {
    totalSeats = backendPricing.actualTotalQuantity;
  } else if (backendPricing && backendPricing.categoryBreakdown) {
    totalSeats = backendPricing.categoryBreakdown.reduce((sum, category) => sum + category.quantity, 0);
  } else if (ticketData.selectedGeneralTickets) {
    totalSeats = ticketData.selectedGeneralTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  }
  
  doc.text('Total:', rightColumnX, currentY);
  doc.text(totalSeats.toString(), rightColumnX + 25, currentY);
  
  return currentY + 8;
};

export const generateTicketPDF = async (ticketData: TicketData & { eventOccurrenceId?: string }) => {
  console.log('Generating single-page PDF for booking:', ticketData.booking.id);

  const isCombinedBooking = (ticketData.booking as any).is_combined || false;
  const combinedBookingIds = (ticketData.booking as any).combined_booking_ids || [];

  const backendPricing = await fetchPricingData(ticketData.booking.id);
  console.log('Backend pricing data for PDF:', backendPricing);
  
  let customerInfo = ticketData.customerInfo;
  
  if (backendPricing?.customerData && backendPricing.customerData.name) {
    const fullName = backendPricing.customerData.name.trim();
    console.log('Full name from booking data:', fullName);
    
    const nameParts = fullName.split(' ').filter(part => part.length > 0);
    let firstName = '';
    let lastName = '';
    
    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = '';
    } else if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }
    
    customerInfo = {
      firstName: firstName,
      lastName: lastName,
      email: backendPricing.customerData.email || ticketData.customerInfo.email,
      phone: backendPricing.customerData.phone || ticketData.customerInfo.phone
    };
  }
  
  const formattedBookingId = generateInvoiceNumber(ticketData.booking.id, ticketData.booking.booking_date);
  console.log('Generated formatted booking ID for PDF:', formattedBookingId);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const config = getSinglePageConfig(pageWidth, pageHeight);
  
  const yellowColor: [number, number, number] = [255, 255, 0];
  const blackColor: [number, number, number] = [0, 0, 0];
  
  const contentWidth = pageWidth - (config.margin * 2);
  const leftColumnX = config.margin + config.contentPadding;
  const rightColumnX = pageWidth * 0.55;
  const leftColumnWidth = (pageWidth * 0.55) - config.margin - (config.contentPadding * 2);
  const rightColumnWidth = pageWidth * 0.45 - config.margin - config.contentPadding;
  
  // Compact header
  doc.setFillColor(...yellowColor);
  doc.rect(config.margin, 10, contentWidth, config.headerHeight, 'F');
  
  doc.setTextColor(...blackColor);
  doc.setFontSize(config.fontSize.title);
  doc.setFont('helvetica', 'bold');
  doc.text('TICKETOOZ.COM', leftColumnX, 22);
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'normal');
  const ticketTypeText = isCombinedBooking ? 'Your Combined Event Tickets' : 'Your Event Ticket';
  doc.text(ticketTypeText, leftColumnX, 30);
  
  // Main content starts at Y=40
  let currentY = 40;
  
  // Event Details Section - Left Column
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Details', leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Event:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addCompactText(doc, ticketData.event.name || 'Event Name', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight;
  
  doc.text('Date & Time:', leftColumnX, currentY);
  
  let eventDate: Date;
  let dateStr: string;
  let timeStr: string;
  
  if (ticketData.event.is_recurring && backendPricing?.occurrenceData) {
    const occurrenceDate = new Date(backendPricing.occurrenceData.occurrence_date);
    dateStr = occurrenceDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const eventTime = backendPricing.eventTime || ticketData.event.event_time;
    if (eventTime) {
      const [hours, minutes] = eventTime.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      
      timeStr = timeDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    } else {
      const occurrenceDateTime = `${backendPricing.occurrenceData.occurrence_date}T${backendPricing.occurrenceData.occurrence_time}`;
      eventDate = new Date(occurrenceDateTime);
      timeStr = eventDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      });
    }
  } else {
    eventDate = new Date(ticketData.event.start_datetime);
    dateStr = eventDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    timeStr = eventDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  }
  
  currentY = addCompactText(doc, `${dateStr} at ${timeStr}`, leftColumnX, currentY + config.lineHeight, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight;
  
  doc.text('Venue:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addCompactText(doc, ticketData.event.venue?.name || 'TBA', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight;
  
  doc.text('Address:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addCompactText(doc, ticketData.event.venue?.address || 'TBA', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  
  // Ticket Information - Right Column (starts at Y=40)
  const ticketY = displayCompactTicketBreakdown(doc, ticketData, backendPricing, rightColumnX, rightColumnWidth, 40, config);
  
  // Customer Information - Left Column continues
  currentY += config.sectionSpacing;
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Information', leftColumnX, currentY);
  
  currentY += config.sectionSpacing;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Name:', leftColumnX, currentY);
  currentY += config.lineHeight;
  
  const firstName = customerInfo.firstName || '';
  const lastName = customerInfo.lastName || '';
  const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
  
  if (fullName) {
    currentY = addCompactText(doc, fullName, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  } else {
    currentY = addCompactText(doc, 'Guest User', leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  }
  currentY += config.lineHeight;

  doc.text('Email:', leftColumnX, currentY);
  currentY += config.lineHeight;
  currentY = addCompactText(doc, customerInfo.email, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight;
  
  doc.text('Phone:', leftColumnX, currentY);
  currentY = addCompactText(doc, customerInfo.phone, leftColumnX, currentY + config.lineHeight, leftColumnWidth, config.fontSize.body);
  currentY += config.lineHeight * 2;
  
  // Booking ID
  if (isCombinedBooking && combinedBookingIds.length > 0) {
    doc.text('Combined Booking IDs:', leftColumnX, currentY);
    currentY += config.lineHeight;
    combinedBookingIds.forEach((id: string, index: number) => {
      const formattedCombinedId = generateInvoiceNumber(id, ticketData.booking.booking_date);
      const shortId = formattedCombinedId.slice(0, 20) + (formattedCombinedId.length > 20 ? '...' : '');
      currentY = addCompactText(doc, `${index + 1}. ${shortId}`, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
    });
  } else {
    doc.text('Booking ID:', leftColumnX, currentY);
    currentY += config.lineHeight;
    currentY = addCompactText(doc, formattedBookingId, leftColumnX, currentY, leftColumnWidth, config.fontSize.body);
  }
  
  // QR Code - Right Column
  const qrY = Math.max(ticketY, 120);
  
  const verificationUrl = `${window.location.origin}/verify-ticket/${formattedBookingId}`;
  console.log('Generated QR verification URL:', verificationUrl);
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: config.qrSize * 3,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    doc.addImage(qrCodeDataUrl, 'PNG', rightColumnX, qrY, config.qrSize, config.qrSize);
    doc.setFontSize(config.fontSize.small);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan to verify', rightColumnX, qrY + config.qrSize + 5);
    
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(rightColumnX, qrY, config.qrSize, config.qrSize);
    
    doc.setFontSize(config.fontSize.small);
    doc.setFont('helvetica', 'bold');
    doc.text('QR Code', rightColumnX + config.qrSize/2 - 12, qrY + config.qrSize/2 + 2);
    doc.text('Error', rightColumnX + config.qrSize/2 - 8, qrY + config.qrSize/2 + 8);
  }
  
  // Payment Summary - Below QR Code
  let paymentY = qrY + config.qrSize + 15;
  
  doc.setFontSize(config.fontSize.heading);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Summary', rightColumnX, paymentY);
  
  paymentY += config.sectionSpacing;
  doc.setFontSize(config.fontSize.body);
  doc.setFont('helvetica', 'normal');
  
  if (backendPricing) {
    if (backendPricing.categoryBreakdown && backendPricing.categoryBreakdown.length > 0) {
      backendPricing.categoryBreakdown.forEach((category) => {
        doc.text(`${category.category} (×${category.quantity}):`, rightColumnX, paymentY);
        doc.text(`₹${category.totalPrice.toFixed(2)}`, rightColumnX + 55, paymentY);
        paymentY += config.lineHeight + 1;
      });
    } else {
      doc.text(`Tickets (×${ticketData.booking.quantity}):`, rightColumnX, paymentY);
      doc.text(`₹${backendPricing.basePrice.toFixed(2)}`, rightColumnX + 55, paymentY);
      paymentY += config.lineHeight + 1;
    }
    
    if (backendPricing.convenienceFee > 0) {
      doc.text('Convenience Fee:', rightColumnX, paymentY);
      doc.text(`₹${backendPricing.convenienceFee.toFixed(2)}`, rightColumnX + 55, paymentY);
      paymentY += config.lineHeight + 1;
      
      if (backendPricing.gstAmount > 0) {
        doc.text('GST (18%):', rightColumnX, paymentY);
        doc.text(`₹${backendPricing.gstAmount.toFixed(2)}`, rightColumnX + 55, paymentY);
        paymentY += config.lineHeight + 1;
      }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', rightColumnX, paymentY);
    doc.text(`₹${backendPricing.totalPrice.toFixed(2)}`, rightColumnX + 55, paymentY);
  } else {
    const totalPrice = ticketData.totalPrice;
    const convenienceFee = ticketData.convenienceFee || 0;
    const basePrice = totalPrice - convenienceFee;
    
    doc.text(`Tickets (×${ticketData.booking.quantity}):`, rightColumnX, paymentY);
    doc.text(`₹${basePrice.toFixed(2)}`, rightColumnX + 55, paymentY);
    paymentY += config.lineHeight + 1;
    
    if (convenienceFee > 0) {
      const convenienceFeeBeforeGst = convenienceFee / 1.18;
      const gstAmount = convenienceFee - convenienceFeeBeforeGst;
      
      doc.text('Convenience Fee:', rightColumnX, paymentY);
      doc.text(`₹${convenienceFeeBeforeGst.toFixed(2)}`, rightColumnX + 55, paymentY);
      paymentY += config.lineHeight + 1;
      
      if (gstAmount > 0) {
        doc.text('GST (18%):', rightColumnX, paymentY);
        doc.text(`₹${gstAmount.toFixed(2)}`, rightColumnX + 55, paymentY);
        paymentY += config.lineHeight + 1;
      }
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', rightColumnX, paymentY);
    doc.text(`₹${totalPrice.toFixed(2)}`, rightColumnX + 55, paymentY);
  }
  
  // Important Notices - Bottom of page
  const noticesY = pageHeight - 35;
  
  doc.setFontSize(config.fontSize.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANT NOTICES:', leftColumnX, noticesY);
  
  let noticeY = noticesY + 5;
  doc.setFontSize(config.fontSize.small);
  doc.setFont('helvetica', 'normal');
  
  const notices = [
    '• Please bring this ticket and valid ID',
    '• Entry subject to security check',
    '• No refunds or exchanges allowed',
    '• Support: support@ticketooz.com'
  ];
  
  notices.forEach(notice => {
    doc.text(notice, leftColumnX, noticeY);
    noticeY += 3;
  });
  
  doc.save(`ticket-${formattedBookingId}.pdf`);
};
